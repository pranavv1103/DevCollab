package com.hrpilot.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A single message in a chat session — either from the user or the AI assistant.
 */
@Entity
@Table(name = "chat_message")
@Data
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageRole role;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /** JSON array of source chunk IDs used to generate this answer */
    @Column(columnDefinition = "TEXT")
    private String sources;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** True if this answer was served from Redis cache */
    private boolean cacheHit;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
