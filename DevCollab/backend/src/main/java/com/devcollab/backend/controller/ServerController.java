package com.devcollab.backend.controller;

import com.devcollab.backend.dto.response.MemberProfileResponse;
import com.devcollab.backend.dto.response.MessageResponse;
import com.devcollab.backend.entity.Server;
import com.devcollab.backend.entity.ServerMember;
import com.devcollab.backend.entity.ServerRole;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.MessageRepository;
import com.devcollab.backend.repository.ServerMemberRepository;
import com.devcollab.backend.repository.ServerRepository;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.repository.ServerAuditLogRepository;
import com.devcollab.backend.entity.ServerAuditLog;
import com.devcollab.backend.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/servers")
@SuppressWarnings("null")
public class ServerController {

    @Autowired
    ServerRepository serverRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    ServerMemberRepository serverMemberRepository;

    @Autowired
    ChannelRepository channelRepository;

    @Autowired
    MessageRepository messageRepository;

    @Autowired
    ServerAuditLogRepository serverAuditLogRepository;

    @GetMapping
    public ResponseEntity<List<Server>> getUserServers() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<ServerMember> memberships = serverMemberRepository.findByUserId(userDetails.getId());
        List<Server> servers = memberships.stream().map(ServerMember::getServer).collect(Collectors.toList());
        return ResponseEntity.ok(servers);
    }

    @GetMapping("/{serverId}")
    public ResponseEntity<?> getServerById(@PathVariable Long serverId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
        
        if (!memberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: You are not a member of this server"));
        }

        Optional<Server> serverOpt = serverRepository.findById(serverId);
        if (!serverOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(serverOpt.get());
    }

    @PostMapping
    public ResponseEntity<?> createServer(@RequestBody Server serverRequest) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User owner = userRepository.findById(userDetails.getId()).orElse(null);

        if (owner == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: User not found."));
        }

        Server server = Server.builder()
                .name(serverRequest.getName())
                .description(serverRequest.getDescription())
                .iconUrl(serverRequest.getIconUrl())
                .owner(owner)
                .build();

        Server savedServer = serverRepository.save(server);

        ServerMember member = ServerMember.builder()
                .server(savedServer)
                .user(owner)
                .role(ServerRole.OWNER)
                .joinedAt(LocalDateTime.now())
                .build();
        serverMemberRepository.save(member);

        com.devcollab.backend.entity.Channel general = com.devcollab.backend.entity.Channel.builder()
                .name("general")
                .type("text")
                .channelType(com.devcollab.backend.entity.ChannelType.PUBLIC)
                .server(savedServer)
                .build();
        channelRepository.save(general);

        return ResponseEntity.ok(savedServer);
    }
    
    @PostMapping("/{inviteCode}/join")
    public ResponseEntity<?> joinServer(@PathVariable String inviteCode) {
        Optional<Server> serverOpt = serverRepository.findByInviteCode(inviteCode);
        if (!serverOpt.isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid invite code"));
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: User not found"));
        }
        
        Server server = serverOpt.get();
        Optional<ServerMember> existingMember = serverMemberRepository.findByServerIdAndUserId(server.getId(), user.getId());
        if (existingMember.isPresent()) {
             return ResponseEntity.badRequest().body(new MessageResponse("Error: You are already a member of this server"));
        }
        
        ServerMember newMember = ServerMember.builder()
                .server(server)
                .user(user)
                .role(ServerRole.MEMBER)
                .joinedAt(LocalDateTime.now())
                .build();
        serverMemberRepository.save(newMember);
        
        serverAuditLogRepository.save(ServerAuditLog.builder()
            .server(server).actor(user)
            .actionType("MEMBER_JOIN")
            .actionDetails(user.getUsername() + " joined the server")
            .build());

        return ResponseEntity.ok(server);
    }
    
    @GetMapping("/{serverId}/members")
    public ResponseEntity<?> getServerMembers(@PathVariable Long serverId) {
         if (!serverRepository.existsById(serverId)) {
             return ResponseEntity.badRequest().body(new MessageResponse("Error: Server not found"));
         }
         
         UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
         Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
         if (!memberOpt.isPresent()) {
             return ResponseEntity.status(403).body(new MessageResponse("Error: You are not a member of this server"));
         }
         
         return ResponseEntity.ok(serverMemberRepository.findByServerId(serverId));
    }

    @DeleteMapping("/{serverId}")
    public ResponseEntity<?> deleteServer(@PathVariable Long serverId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<Server> serverOpt = serverRepository.findById(serverId);
        
        if (!serverOpt.isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Server not found"));
        }
        
        Server server = serverOpt.get();
        if (!server.getOwner().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Only the owner can delete the server"));
        }
        
        serverRepository.delete(server);
        return ResponseEntity.ok(new MessageResponse("Server deleted successfully"));
    }

    @PutMapping("/{serverId}")
    public ResponseEntity<?> updateServer(@PathVariable Long serverId, @RequestBody Server updateRequest) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());

        // Only OWNER can update server-level settings (name, description, icon)
        if (!memberOpt.isPresent() || memberOpt.get().getRole() != ServerRole.OWNER) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Only the server owner can update server settings"));
        }

        Optional<Server> serverOpt = serverRepository.findById(serverId);
        if (serverOpt.isPresent()) {
            Server server = serverOpt.get();
            if (updateRequest.getName() != null) server.setName(updateRequest.getName());
            if (updateRequest.getDescription() != null) server.setDescription(updateRequest.getDescription());
            if (updateRequest.getIconUrl() != null) server.setIconUrl(updateRequest.getIconUrl());
            serverRepository.save(server);
            return ResponseEntity.ok(server);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{serverId}/my-role")
    public ResponseEntity<?> getMyRole(@PathVariable Long serverId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
        if (!memberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member of this server"));
        }
        Map<String, String> result = new HashMap<>();
        result.put("role", memberOpt.get().getRole().toString());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{serverId}/analytics")
    public ResponseEntity<?> getServerAnalytics(@PathVariable Long serverId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
        if (!memberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member of this server"));
        }
        long memberCount = serverMemberRepository.findByServerId(serverId).size();
        long channelCount = channelRepository.findByServerId(serverId).size();
        long weeklyMessages = messageRepository.countByChannelServerIdAndTimestampAfter(serverId, LocalDateTime.now().minusDays(7));

        // Build per-day array [Sun .. Sat or Mon..Sun depending on current day]
        // Index 0 = 6 days ago, Index 6 = today
        long[] dailyCounts = new long[7];
        java.util.List<Object[]> rows = messageRepository.getDailyMessageCountsForServer(serverId);
        for (Object[] row : rows) {
            int dayOffset = ((Number) row[0]).intValue(); // 0 = today, 6 = 6 days ago
            long count = ((Number) row[1]).longValue();
            if (dayOffset >= 0 && dayOffset < 7) {
                dailyCounts[6 - dayOffset] = count; // invert so index 6 = today
            }
        }
        // Convert to list for JSON
        java.util.List<Long> dailyList = new java.util.ArrayList<>();
        for (long c : dailyCounts) dailyList.add(c);

        Map<String, Object> analytics = new HashMap<>();
        analytics.put("memberCount", memberCount);
        analytics.put("channelCount", channelCount);
        analytics.put("weeklyMessages", weeklyMessages);
        analytics.put("dailyMessages", dailyList);
        return ResponseEntity.ok(analytics);
    }

    @DeleteMapping("/{serverId}/leave")
    public ResponseEntity<?> leaveServer(@PathVariable Long serverId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
        if (!memberOpt.isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Not a member of this server"));
        }
        ServerMember member = memberOpt.get();
        if (member.getRole() == ServerRole.OWNER) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Transfer ownership before leaving"));
        }
        serverMemberRepository.delete(member);
        
        Server server = serverRepository.findById(serverId).orElse(null);
        User leavingUser = userRepository.findById(userDetails.getId()).orElse(null);
        if (server != null && leavingUser != null) {
            serverAuditLogRepository.save(ServerAuditLog.builder()
                .server(server).actor(leavingUser)
                .actionType("MEMBER_LEAVE")
                .actionDetails(leavingUser.getUsername() + " left the server")
                .build());
        }
        return ResponseEntity.ok(new MessageResponse("Left server successfully"));
    }

    // ── Member profile ─────────────────────────────────────────────────────────

    /**
     * GET /api/servers/{serverId}/members/{userId}/profile?channelId={channelId}
     * Returns full profile + engagement stats + permission flags for the current viewer.
     */
    @GetMapping("/{serverId}/members/{userId}/profile")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMemberProfile(
            @PathVariable Long serverId,
            @PathVariable Long userId,
            @RequestParam(required = false) Long channelId) {

        UserDetailsImpl viewerDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long viewerId = viewerDetails.getId();

        // Viewer must be a member of the server
        Optional<ServerMember> viewerMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, viewerId);
        if (!viewerMemberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member of this server"));
        }
        ServerRole viewerRole = viewerMemberOpt.get().getRole();

        // Target user must also be a member
        Optional<ServerMember> targetMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userId);
        if (!targetMemberOpt.isPresent()) {
            return ResponseEntity.status(404).body(new MessageResponse("Error: User is not a member of this server"));
        }
        ServerMember targetMember = targetMemberOpt.get();
        User targetUser = targetMember.getUser();

        boolean isSelf = viewerId.equals(userId);

        // ── Permission matrix ────────────────────────────────────────────────
        // canChangeRole: OWNER can change anyone's role except their own OWNER status;
        //                ADMINs cannot change roles at all.
        boolean canChangeRole = !isSelf
                && viewerRole == ServerRole.OWNER
                && targetMember.getRole() != ServerRole.OWNER;

        // canKick: OWNER can kick anyone except self and another OWNER;
        //          ADMIN can kick MEMBER and VIEWER only.
        boolean canKick = !isSelf && (
                viewerRole == ServerRole.OWNER && targetMember.getRole() != ServerRole.OWNER
                || (viewerRole == ServerRole.ADMIN
                    && (targetMember.getRole() == ServerRole.MEMBER || targetMember.getRole() == ServerRole.VIEWER))
        );

        // ── Stats ─────────────────────────────────────────────────────────────
        long totalInServer = messageRepository.countByUserIdAndServerId(userId, serverId);
        long totalInChannel = channelId != null
                ? messageRepository.countByUserIdAndChannelId(userId, channelId)
                : 0L;
        long replies = messageRepository.countRepliesByUserIdAndServerId(userId, serverId);
        long threads = messageRepository.countThreadsByUserIdAndServerId(userId, serverId);

        List<Object[]> rawActivity = messageRepository.getChannelActivityByUserIdAndServerId(userId, serverId);
        List<MemberProfileResponse.ChannelActivity> channelActivity = new ArrayList<>();
        String mostActiveChannelName = null;
        for (Object[] row : rawActivity) {
            Long chId = (Long) row[0];
            String chName = (String) row[1];
            long count = (Long) row[2];
            if (mostActiveChannelName == null) mostActiveChannelName = chName;
            channelActivity.add(MemberProfileResponse.ChannelActivity.builder()
                    .channelId(chId).channelName(chName).messageCount(count).build());
        }

        // ── Build response ────────────────────────────────────────────────────
        MemberProfileResponse response = MemberProfileResponse.builder()
                .userId(targetUser.getId())
                .username(targetUser.getUsername())
                // Email only visible to OWNER and to the user themselves
                .email(isSelf || viewerRole == ServerRole.OWNER ? targetUser.getEmail() : null)
                .profilePictureUrl(targetUser.getProfilePictureUrl())
                .bio(targetUser.getBio())
                .programmingLanguages(targetUser.getProgrammingLanguages())
                .githubUrl(targetUser.getGithubUrl())
                .linkedinUrl(targetUser.getLinkedinUrl())
                .portfolioUrl(targetUser.getPortfolioUrl())
                .status(targetUser.getStatus())
                .lastSeen(targetUser.getLastSeen())
                .serverRole(targetMember.getRole())
                .joinedServerAt(targetMember.getJoinedAt())
                .totalMessagesInServer(totalInServer)
                .totalMessagesInChannel(totalInChannel)
                .repliesPosted(replies)
                .threadsStarted(threads)
                .mostActiveChannelName(mostActiveChannelName)
                .channelActivity(channelActivity)
                .viewerRole(viewerRole.name())
                .isSelf(isSelf)
                .canChangeRole(canChangeRole)
                .canKick(canKick)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /api/servers/{serverId}/members/{userId}/role
     * Body: { "role": "ADMIN" | "MEMBER" }
     * Only OWNER can change roles. Cannot change another OWNER's role.
     */
    @PatchMapping("/{serverId}/members/{userId}/role")
    public ResponseEntity<?> changeMemberRole(
            @PathVariable Long serverId,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {

        UserDetailsImpl viewerDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long viewerId = viewerDetails.getId();

        Optional<ServerMember> viewerMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, viewerId);
        if (!viewerMemberOpt.isPresent() || viewerMemberOpt.get().getRole() != ServerRole.OWNER) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Only the server owner can change roles"));
        }

        if (viewerId.equals(userId)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Cannot change your own role"));
        }

        Optional<ServerMember> targetMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userId);
        if (!targetMemberOpt.isPresent()) {
            return ResponseEntity.status(404).body(new MessageResponse("Error: User is not a member of this server"));
        }

        ServerMember targetMember = targetMemberOpt.get();
        if (targetMember.getRole() == ServerRole.OWNER) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Cannot change the owner's role"));
        }

        String newRoleStr = body.get("role");
        if (newRoleStr == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: 'role' field is required"));
        }

        ServerRole newRole;
        try {
            newRole = ServerRole.valueOf(newRoleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid role. Use ADMIN, MEMBER, or VIEWER"));
        }

        if (newRole == ServerRole.OWNER) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Use the transfer ownership endpoint to assign OWNER"));
        }

        targetMember.setRole(newRole);
        serverMemberRepository.save(targetMember);

        Server server = serverRepository.findById(serverId).orElse(null);
        User viewerUser = userRepository.findById(viewerId).orElse(null);
        User targetUser = userRepository.findById(userId).orElse(null);
        if (server != null && viewerUser != null && targetUser != null) {
            serverAuditLogRepository.save(ServerAuditLog.builder()
                .server(server).actor(viewerUser)
                .actionType("ROLE_CHANGE")
                .actionDetails(viewerUser.getUsername() + " changed " + targetUser.getUsername() + "'s role to " + newRole.name())
                .build());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("userId", userId);
        result.put("role", newRole.name());
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/servers/{serverId}/members/{userId}
     * Kick member. OWNER can kick anyone (except self); ADMIN can kick MEMBERs only.
     */
    @DeleteMapping("/{serverId}/members/{userId}")
    public ResponseEntity<?> kickMember(
            @PathVariable Long serverId,
            @PathVariable Long userId) {

        UserDetailsImpl viewerDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long viewerId = viewerDetails.getId();

        if (viewerId.equals(userId)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Use the leave endpoint to remove yourself"));
        }

        Optional<ServerMember> viewerMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, viewerId);
        if (!viewerMemberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member of this server"));
        }
        ServerRole viewerRole = viewerMemberOpt.get().getRole();

        Optional<ServerMember> targetMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userId);
        if (!targetMemberOpt.isPresent()) {
            return ResponseEntity.status(404).body(new MessageResponse("Error: User is not a member of this server"));
        }
        ServerMember targetMember = targetMemberOpt.get();

        boolean allowed = viewerRole == ServerRole.OWNER
                || (viewerRole == ServerRole.ADMIN
                    && (targetMember.getRole() == ServerRole.MEMBER || targetMember.getRole() == ServerRole.VIEWER));

        if (!allowed) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Insufficient permissions to kick this member"));
        }

        serverMemberRepository.delete(targetMember);

        Server server = serverRepository.findById(serverId).orElse(null);
        User viewerUser = userRepository.findById(viewerId).orElse(null);
        User kicked = targetMember.getUser();
        if (server != null && viewerUser != null) {
            serverAuditLogRepository.save(ServerAuditLog.builder()
                .server(server).actor(viewerUser)
                .actionType("MEMBER_KICK")
                .actionDetails(viewerUser.getUsername() + " kicked " + kicked.getUsername())
                .build());
        }
        return ResponseEntity.ok(new MessageResponse("Member removed from server"));
    }

    // ── Transfer Ownership ─────────────────────────────────────────────────────

    /**
     * POST /api/servers/{serverId}/transfer-ownership
     * Body: { "userId": <targetUserId> }
     * Only the current OWNER can transfer ownership.
     * The current owner is demoted to ADMIN after the transfer.
     */
    @PostMapping("/{serverId}/transfer-ownership")
    @Transactional
    public ResponseEntity<?> transferOwnership(
            @PathVariable Long serverId,
            @RequestBody Map<String, Object> body) {

        UserDetailsImpl viewerDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long viewerId = viewerDetails.getId();

        Optional<ServerMember> ownerMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, viewerId);
        if (!ownerMemberOpt.isPresent() || ownerMemberOpt.get().getRole() != ServerRole.OWNER) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Only the server OWNER can transfer ownership"));
        }

        Object targetIdObj = body.get("userId");
        if (targetIdObj == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: 'userId' field is required"));
        }
        Long targetUserId;
        try {
            targetUserId = Long.valueOf(targetIdObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid userId"));
        }

        if (viewerId.equals(targetUserId)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Cannot transfer ownership to yourself"));
        }

        Optional<ServerMember> targetMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, targetUserId);
        if (!targetMemberOpt.isPresent()) {
            return ResponseEntity.status(404).body(new MessageResponse("Error: Target user is not a member of this server"));
        }

        ServerMember ownerMember = ownerMemberOpt.get();
        ServerMember targetMember = targetMemberOpt.get();

        // Transfer: new owner ← OWNER, old owner ← ADMIN
        targetMember.setRole(ServerRole.OWNER);
        ownerMember.setRole(ServerRole.ADMIN);
        serverMemberRepository.save(targetMember);
        serverMemberRepository.save(ownerMember);

        // Update the server's owner field
        Optional<Server> serverOpt = serverRepository.findById(serverId);
        if (serverOpt.isPresent()) {
            Server server = serverOpt.get();
            User newOwnerUser = userRepository.findById(targetUserId).orElse(null);
            if (newOwnerUser != null) {
                server.setOwner(newOwnerUser);
                serverRepository.save(server);
            }
        }

        User viewerUser = userRepository.findById(viewerId).orElse(null);
        User targetUser = userRepository.findById(targetUserId).orElse(null);
        Server server = serverRepository.findById(serverId).orElse(null);
        if (server != null && viewerUser != null && targetUser != null) {
            serverAuditLogRepository.save(ServerAuditLog.builder()
                .server(server).actor(viewerUser)
                .actionType("OWNERSHIP_TRANSFER")
                .actionDetails(viewerUser.getUsername() + " transferred ownership to " + targetUser.getUsername())
                .build());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("newOwnerUserId", targetUserId);
        result.put("message", "Ownership transferred successfully");
        return ResponseEntity.ok(result);
    }

    // ── Audit Log ──────────────────────────────────────────────────────────────

    @GetMapping("/{serverId}/audit-log")
    public ResponseEntity<?> getAuditLog(@PathVariable Long serverId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
        if (!memberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member"));
        }
        ServerRole role = memberOpt.get().getRole();
        if (role != ServerRole.OWNER && role != ServerRole.ADMIN) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Only OWNER or ADMIN can view audit log"));
        }
        List<ServerAuditLog> logs = serverAuditLogRepository.findByServerIdOrderByCreatedAtDesc(serverId);
        // Manually map to avoid @JsonIgnore on server/actor
        List<Map<String, Object>> result = new ArrayList<>();
        for (ServerAuditLog log : logs) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("id", log.getId());
            entry.put("actionType", log.getActionType());
            entry.put("actionDetails", log.getActionDetails());
            entry.put("createdAt", log.getCreatedAt());
            if (log.getActor() != null) entry.put("actorUsername", log.getActor().getUsername());
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }
}
