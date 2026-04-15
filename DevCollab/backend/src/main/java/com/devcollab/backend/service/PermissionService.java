package com.devcollab.backend.service;

import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.ChannelType;
import com.devcollab.backend.entity.ServerRole;
import org.springframework.stereotype.Service;

/**
 * Central permission helper used by REST controllers and STOMP handlers.
 * All RBAC rules live here so they are consistent across the codebase.
 */
@Service
public class PermissionService {

    // ── Channel access ────────────────────────────────────────────────────────

    /**
     * Whether the given role can see (list) the channel.
     */
    public boolean canViewChannel(ServerRole role, Channel channel) {
        if (channel.getChannelType() == ChannelType.PRIVATE) {
            return role.canAccessPrivate();   // OWNER / ADMIN only
        }
        // PUBLIC and ANNOUNCEMENT are visible to everyone in the server
        return true;
    }

    /**
     * Whether the given role can read messages in the channel.
     * Same rules as canViewChannel — if you can see it you can read it.
     */
    public boolean canReadChannel(ServerRole role, Channel channel) {
        return canViewChannel(role, channel);
    }

    /**
     * Whether the given role can send messages in the channel.
     */
    public boolean canSendMessage(ServerRole role, Channel channel) {
        // VIEWER can never send
        if (role == ServerRole.VIEWER) return false;

        switch (channel.getChannelType()) {
            case PUBLIC:
                // OWNER, ADMIN, MEMBER can send
                return role.canSend();

            case PRIVATE:
                // Must first have access, and only OWNER/ADMIN
                return role.canAccessPrivate();

            case ANNOUNCEMENT:
                // Only OWNER and ADMIN can send
                return role.canSendInAnnouncement();

            default:
                return false;
        }
    }

    // ── Message moderation ────────────────────────────────────────────────────

    /**
     * Whether the actor can delete the given message.
     * Authors can always delete their own messages.
     * ADMIN and OWNER can delete anyone's message (moderation).
     */
    public boolean canDeleteMessage(ServerRole actorRole, Long actorUserId, Long messageAuthorId) {
        if (actorUserId.equals(messageAuthorId)) return true;   // own message
        return actorRole.isPrivileged();                        // ADMIN / OWNER moderation
    }

    /**
     * Whether the actor can edit the given message.
     * Only the author may edit their own message (moderation does not allow editing others' words).
     */
    public boolean canEditMessage(Long actorUserId, Long messageAuthorId) {
        return actorUserId.equals(messageAuthorId);
    }

    // ── Server management ─────────────────────────────────────────────────────

    /**
     * Whether the role can update server-level settings (name, description, icon).
     */
    public boolean canUpdateServerSettings(ServerRole role) {
        return role == ServerRole.OWNER;
    }

    /**
     * Whether the viewer can change the target's role.
     * Rule: only OWNER can change roles; cannot change another OWNER's role; cannot change own role.
     */
    public boolean canChangeRole(ServerRole viewerRole, ServerRole targetRole, boolean isSelf) {
        if (isSelf) return false;
        if (viewerRole != ServerRole.OWNER) return false;
        return targetRole != ServerRole.OWNER;   // cannot demote the owner
    }

    /**
     * Whether the viewer can kick the target member.
     * OWNER can kick ADMIN, MEMBER, VIEWER.
     * ADMIN can kick MEMBER and VIEWER only.
     */
    public boolean canKick(ServerRole viewerRole, ServerRole targetRole, boolean isSelf) {
        if (isSelf) return false;
        if (viewerRole == ServerRole.OWNER && targetRole != ServerRole.OWNER) return true;
        if (viewerRole == ServerRole.ADMIN) {
            return targetRole == ServerRole.MEMBER || targetRole == ServerRole.VIEWER;
        }
        return false;
    }
}
