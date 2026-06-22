package com.hrpilot.service;

import com.hrpilot.dto.ChatResponse;
import com.hrpilot.entity.ChatMessage;
import com.hrpilot.entity.ChatSession;
import com.hrpilot.entity.MessageRole;
import com.hrpilot.repository.ChatMessageRepository;
import com.hrpilot.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Manages chat sessions and messages, integrating Redis caching and the RAG engine.
 *
 * Cache key format: "qa:{companyId}:{MD5(question.toLowerCase().trim())}"
 * Cache TTL: 24 hours — so common questions in the same company get instant answers.
 *
 * Beginners' note:
 * Redis is checked BEFORE calling OpenAI. If the same question was asked before
 * (by any employee in the same company), we return the cached answer instantly
 * and for free (no API call = no cost). This is important for large teams.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private static final Duration CACHE_TTL = Duration.ofHours(24);

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final RagService ragService;
    private final StringRedisTemplate redisTemplate;

    public ChatResponse sendMessage(String question, UUID sessionId, UUID userId, UUID companyId) {
        // Get or create session
        ChatSession session;
        if (sessionId != null) {
            session = sessionRepository.findById(sessionId)
                    .orElseGet(() -> createSession(userId, companyId));
        } else {
            session = createSession(userId, companyId);
        }

        // Save user's question
        ChatMessage userMsg = new ChatMessage();
        userMsg.setSessionId(session.getId());
        userMsg.setRole(MessageRole.USER);
        userMsg.setContent(question);
        messageRepository.save(userMsg);

        // Check cache
        String cacheKey = buildCacheKey(companyId, question);
        String cachedAnswer = redisTemplate.opsForValue().get(cacheKey);
        boolean cacheHit = cachedAnswer != null;

        String answer;
        String sources;

        if (cacheHit && cachedAnswer != null) {
            log.debug("Cache hit for key {}", cacheKey);
            // Cached value format: "ANSWER|||SOURCES_JSON"
            String[] parts = cachedAnswer.split("\\|\\|\\|", 2);
            answer = parts[0];
            sources = parts.length > 1 ? parts[1] : "[]";
        } else {
            RagService.RagResult result = ragService.answer(question, companyId);
            answer = result.answer();
            sources = result.sourcesJson();
            redisTemplate.opsForValue().set(cacheKey, answer + "|||" + sources, CACHE_TTL);
        }

        // Save assistant's answer
        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setSessionId(session.getId());
        assistantMsg.setRole(MessageRole.ASSISTANT);
        assistantMsg.setContent(answer);
        assistantMsg.setSources(sources);
        assistantMsg.setCacheHit(cacheHit);
        assistantMsg = messageRepository.save(assistantMsg);

        return ChatResponse.builder()
                .sessionId(session.getId().toString())
                .messageId(assistantMsg.getId().toString())
                .answer(answer)
                .sources(sources)
                .cacheHit(cacheHit)
                .build();
    }

    public List<ChatSession> getSessions(UUID userId) {
        return sessionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<ChatMessage> getMessages(UUID sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    private ChatSession createSession(UUID userId, UUID companyId) {
        ChatSession session = new ChatSession();
        session.setUserId(userId);
        session.setCompanyId(companyId);
        return sessionRepository.save(session);
    }

    private String buildCacheKey(UUID companyId, String question) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(question.toLowerCase().trim().getBytes(StandardCharsets.UTF_8));
            return "qa:" + companyId + ":" + HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return "qa:" + companyId + ":" + Math.abs(question.hashCode());
        }
    }
}
