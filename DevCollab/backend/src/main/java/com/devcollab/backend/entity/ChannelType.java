package com.devcollab.backend.entity;

/**
 * Defines the access and permission model for a channel.
 *
 * PUBLIC:       Everyone in the server (OWNER, ADMIN, MEMBER, VIEWER) can read.
 *               OWNER, ADMIN, MEMBER can send. VIEWER is read-only.
 *
 * PRIVATE:      Only OWNER and ADMIN can access (read / send) by default.
 *               MEMBER and VIEWER are excluded unless explicitly granted (future extension).
 *
 * ANNOUNCEMENT: Everyone in the server can read.
 *               Only OWNER and ADMIN can send. MEMBER and VIEWER are read-only.
 */
public enum ChannelType {
    PUBLIC,
    PRIVATE,
    ANNOUNCEMENT
}
