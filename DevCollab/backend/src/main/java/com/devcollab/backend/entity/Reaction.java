package com.devcollab.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "reactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Message message;

    @com.fasterxml.jackson.annotation.JsonProperty("messageId")
    public Long getMessageId() { return message != null ? message.getId() : null; }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "email", "ownedServers", "role", "status", "lastSeen", "programmingLanguages", "bio", "githubUrl", "linkedinUrl", "portfolioUrl", "themePreference"})
    private User user;

    @Column(nullable = false)
    private String emoji;
}
