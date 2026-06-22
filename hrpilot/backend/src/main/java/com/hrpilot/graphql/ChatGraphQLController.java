package com.hrpilot.graphql;

import com.hrpilot.entity.ChatMessage;
import com.hrpilot.entity.ChatSession;
import com.hrpilot.repository.ChatMessageRepository;
import com.hrpilot.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

/**
 * GraphQL resolvers for chat-related queries.
 *
 * Beginners' note:
 * GraphQL is an alternative to REST where clients request exactly the data they need.
 * @QueryMapping → maps to a "query" in the schema
 * @SchemaMapping → resolves a nested field within a type (like messages inside ChatSession)
 *
 * The GraphiQL playground is available at http://localhost:8080/graphiql for testing.
 */
@Controller
@RequiredArgsConstructor
public class ChatGraphQLController {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;

    @QueryMapping
    public List<ChatSession> chatSessions(@Argument UUID userId) {
        return sessionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @QueryMapping
    public List<ChatMessage> chatMessages(@Argument UUID sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @SchemaMapping(typeName = "ChatSession", field = "messages")
    public List<ChatMessage> getMessages(ChatSession session) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId());
    }
}
