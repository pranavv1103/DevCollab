package com.devcollab.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@Entity
@Table(name = "server_invites")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServerInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 12)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "channels", "members"})
    private Server server;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "ownedServers", "password"})
    private User createdBy;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** null = never expires */
    private LocalDateTime expiresAt;

    @Builder.Default
    private int uses = 0;

    /** null = unlimited uses */
    private Integer maxUses;
}
