package com.devcollab.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "channels")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Channel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /**
     * Legacy free-text type field kept for backward compatibility.
     * Use {@link #channelType} for all permission logic.
     */
    @Column(nullable = false)
    private String type; // "text" etc.

    private String description;

    /**
     * Canonical channel permission model.
     * Stored as a VARCHAR so Postgres auto-migrates via ddl-auto=update.
     * Defaults to PUBLIC.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false)
    @Builder.Default
    private ChannelType channelType = ChannelType.PUBLIC;

    /**
     * Derived convenience accessor — true when channelType == PRIVATE.
     * Kept for backward compat with existing code that checks isPrivate().
     */
    public boolean isPrivate() {
        return channelType == ChannelType.PRIVATE;
    }

    /**
     * Setter kept for Spring / Lombok interop. Prefer setting channelType directly.
     * Setting isPrivate=true switches channelType to PRIVATE; false → PUBLIC unless
     * already ANNOUNCEMENT (in which case it is left unchanged).
     */
    public void setPrivate(boolean p) {
        if (p) {
            this.channelType = ChannelType.PRIVATE;
        } else if (this.channelType == ChannelType.PRIVATE) {
            this.channelType = ChannelType.PUBLIC;
        }
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id", nullable = false)
    @JsonIgnore
    private Server server;

    @JsonProperty("serverId")
    public Long getServerId() {
        return server != null ? server.getId() : null;
    }
}
