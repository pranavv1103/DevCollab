package com.devcollab.backend.controller;

import com.devcollab.backend.dto.response.MessageResponse;
import com.devcollab.backend.entity.Server;
import com.devcollab.backend.entity.ServerMember;
import com.devcollab.backend.entity.ServerRole;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ServerMemberRepository;
import com.devcollab.backend.repository.ServerRepository;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/servers")
public class ServerController {

    @Autowired
    ServerRepository serverRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    ServerMemberRepository serverMemberRepository;

    @GetMapping
    public ResponseEntity<List<Server>> getUserServers() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<ServerMember> memberships = serverMemberRepository.findByUserId(userDetails.getId());
        List<Server> servers = memberships.stream().map(ServerMember::getServer).collect(Collectors.toList());
        return ResponseEntity.ok(servers);
    }

    @GetMapping("/{serverId}")
    public ResponseEntity<?> getServerById(@PathVariable Long serverId) {
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
        
        return ResponseEntity.ok(server);
    }
    
    @GetMapping("/{serverId}/members")
    public ResponseEntity<?> getServerMembers(@PathVariable Long serverId) {
         if (!serverRepository.existsById(serverId)) {
             return ResponseEntity.badRequest().body(new MessageResponse("Error: Server not found"));
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
        
        if (!memberOpt.isPresent() || (memberOpt.get().getRole() != ServerRole.OWNER && memberOpt.get().getRole() != ServerRole.ADMIN)) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to update server settings"));
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
}
