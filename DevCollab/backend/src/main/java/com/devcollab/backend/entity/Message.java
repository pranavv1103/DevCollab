package com.devcollab.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    @JsonIgnore
    private Channel channel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "email", "ownedServers", "role", "status", "lastSeen"})
    private User user;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @OneToOne(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private CodeSnippet snippet;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_message_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"parentMessage", "reactions", "snippet", "channel"})
    private Message parentMessage;
    
    @Builder.Default
    private boolean isEdited = false;
    
    @Builder.Default
    private boolean isPinned = false;
    
    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Reaction> reactions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
