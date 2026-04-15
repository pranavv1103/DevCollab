package com.devcollab.backend.controller;

import com.devcollab.backend.dto.response.MessageResponse;
import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.ChannelType;
import com.devcollab.backend.entity.Server;
import com.devcollab.backend.entity.ServerMember;
import com.devcollab.backend.entity.ServerRole;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.ServerMemberRepository;
import com.devcollab.backend.repository.ServerRepository;
import com.devcollab.backend.security.services.UserDetailsImpl;
import com.devcollab.backend.service.PermissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/servers/{serverId}/channels")
@SuppressWarnings("null")
public class ChannelController {

    @Autowired
    ChannelRepository channelRepository;

    @Autowired
    ServerRepository serverRepository;

    @Autowired
    ServerMemberRepository serverMemberRepository;

    @Autowired
    PermissionService permissionService;

    @GetMapping
    public ResponseEntity<?> getChannelsByServer(@PathVariable Long serverId) {
        if (!serverRepository.existsById(serverId)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Server not found"));
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());

        if (!memberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: You are not a member of this server"));
        }

        ServerRole role = memberOpt.get().getRole();
        List<Channel> channels = channelRepository.findByServerId(serverId).stream()
                .filter(ch -> permissionService.canViewChannel(role, ch))
                .collect(Collectors.toList());

        return ResponseEntity.ok(channels);
    }

    @PostMapping
    public ResponseEntity<?> createChannel(@PathVariable Long serverId, @RequestBody Channel channelRequest) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());

        if (!memberOpt.isPresent() || !memberOpt.get().getRole().isPrivileged()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to create channels"));
        }

        Optional<Server> serverOpt = serverRepository.findById(serverId);
        if (!serverOpt.isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Server not found"));
        }

        // Determine channelType from request; fall back to PUBLIC
        ChannelType channelType = channelRequest.getChannelType();
        if (channelType == null) {
            // Legacy clients may send isPrivate=true
            channelType = channelRequest.isPrivate() ? ChannelType.PRIVATE : ChannelType.PUBLIC;
        }

        Channel channel = Channel.builder()
                .name(channelRequest.getName())
                .type(channelRequest.getType() != null ? channelRequest.getType() : "text")
                .description(channelRequest.getDescription())
                .channelType(channelType)
                .server(serverOpt.get())
                .build();

        Channel savedChannel = channelRepository.save(channel);
        return ResponseEntity.ok(savedChannel);
    }

    @PutMapping("/{channelId}")
    public ResponseEntity<?> updateChannel(
            @PathVariable Long serverId,
            @PathVariable Long channelId,
            @RequestBody Channel channelRequest) {

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());

        if (!memberOpt.isPresent() || !memberOpt.get().getRole().isPrivileged()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to update channels"));
        }

        Optional<Channel> channelOpt = channelRepository.findById(channelId);
        if (!channelOpt.isPresent()) return ResponseEntity.notFound().build();

        Channel channel = channelOpt.get();
        if (!channel.getServer().getId().equals(serverId)) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Channel does not belong to the specified server"));
        }

        if (channelRequest.getName() != null) channel.setName(channelRequest.getName());
        if (channelRequest.getDescription() != null) channel.setDescription(channelRequest.getDescription());
        if (channelRequest.getType() != null) channel.setType(channelRequest.getType());
        if (channelRequest.getChannelType() != null) channel.setChannelType(channelRequest.getChannelType());

        channelRepository.save(channel);
        return ResponseEntity.ok(channel);
    }

    @DeleteMapping("/{channelId}")
    public ResponseEntity<?> deleteChannel(@PathVariable Long serverId, @PathVariable Long channelId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());

        if (!memberOpt.isPresent() || !memberOpt.get().getRole().isPrivileged()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to delete channels"));
        }

        Optional<Channel> channelOpt = channelRepository.findById(channelId);
        if (!channelOpt.isPresent()) return ResponseEntity.notFound().build();

        Channel channel = channelOpt.get();
        if (!channel.getServer().getId().equals(serverId)) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Channel does not belong to the specified server"));
        }

        channelRepository.delete(channel);
        return ResponseEntity.ok(new MessageResponse("Channel deleted successfully"));
    }
}

