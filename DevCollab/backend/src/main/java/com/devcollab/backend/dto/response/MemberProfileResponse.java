package com.devcollab.backend.dto.response;

import com.devcollab.backend.entity.ServerRole;
import com.devcollab.backend.entity.UserStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MemberProfileResponse {

    // ── Global user info ───────────────────────────────────────────────────────
    private Long userId;
    private String username;
    private String email;                  // only populated when viewer is OWNER or self
    private String profilePictureUrl;
    private String bio;
    private String programmingLanguages;
    private String githubUrl;
    private String linkedinUrl;
    private String portfolioUrl;
    private UserStatus status;
    private LocalDateTime lastSeen;

    // ── Server membership ──────────────────────────────────────────────────────
    private ServerRole serverRole;
    private LocalDateTime joinedServerAt;

    // ── Engagement stats ───────────────────────────────────────────────────────
    private long totalMessagesInServer;
    private long totalMessagesInChannel;   // 0 when no channelId context
    private long repliesPosted;
    private long threadsStarted;
    private String mostActiveChannelName;
    private List<ChannelActivity> channelActivity;

    // ── Viewer permissions ─────────────────────────────────────────────────────
    private String viewerRole;             // OWNER / ADMIN / MEMBER
    // Lombok generates isSelf() getter → Jackson strips "is" prefix → JSON "self".
    // @JsonProperty forces the JSON key to be "isSelf" as the frontend expects.
    @JsonProperty("isSelf")
    private boolean isSelf;
    private boolean canChangeRole;         // viewer can promote/demote this member
    private boolean canKick;              // viewer can remove this member

    @Data
    @Builder
    public static class ChannelActivity {
        private Long channelId;
        private String channelName;
        private long messageCount;
    }
}
