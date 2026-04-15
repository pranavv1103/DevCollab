package com.devcollab.backend.entity;

public enum ServerRole {
    OWNER,
    ADMIN,
    MEMBER,
    VIEWER;

    /** True if the role is OWNER or ADMIN. */
    public boolean isPrivileged() {
        return this == OWNER || this == ADMIN;
    }

    /** True if the role can send messages in normal (PUBLIC) channels. */
    public boolean canSend() {
        return this == OWNER || this == ADMIN || this == MEMBER;
    }

    /** True if the role can send in ANNOUNCEMENT channels (only privileged users). */
    public boolean canSendInAnnouncement() {
        return isPrivileged();
    }

    /** True if the role can access PRIVATE channels (only privileged users). */
    public boolean canAccessPrivate() {
        return isPrivileged();
    }
}
