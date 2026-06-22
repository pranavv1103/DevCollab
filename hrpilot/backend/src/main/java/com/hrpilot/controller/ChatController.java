package com.hrpilot.controller;

import com.hrpilot.dto.ChatRequest;
import com.hrpilot.dto.ChatResponse;
import com.hrpilot.entity.ChatMessage;
import com.hrpilot.entity.ChatSession;
import com.hrpilot.security.JwtUtil;
import com.hrpilot.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for the Q&A chat interface.
 *
 * POST /api/v1/chat/message          → ask a question, get an AI answer
 * GET  /api/v1/chat/sessions         → list user's chat sessions
 * GET  /api/v1/chat/sessions/{id}/messages → get all messages in a session
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final JwtUtil jwtUtil;

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(
            @Valid @RequestBody ChatRequest req,
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        UUID userId = jwtUtil.extractUserId(token);
        UUID companyId = jwtUtil.extractCompanyId(token);
        UUID sessionId = req.getSessionId() != null ? UUID.fromString(req.getSessionId()) : null;

        ChatResponse response = chatService.sendMessage(req.getQuestion(), sessionId, userId, companyId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSession>> getSessions(
            @RequestHeader("Authorization") String authHeader) {

        UUID userId = jwtUtil.extractUserId(authHeader.substring(7));
        return ResponseEntity.ok(chatService.getSessions(userId));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(chatService.getMessages(sessionId));
    }
}
