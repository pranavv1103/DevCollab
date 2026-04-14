package com.devcollab.backend.controller;

import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.Server;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.MessageRepository;
import com.devcollab.backend.repository.ServerMemberRepository;
import com.devcollab.backend.repository.ServerRepository;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/search")
public class SearchController {

    @Autowired
    UserRepository userRepository;
    
    @Autowired
    ServerRepository serverRepository;
    
    @Autowired
    ChannelRepository channelRepository;
    
    @Autowired
    MessageRepository messageRepository;

    @Autowired
    ServerMemberRepository serverMemberRepository;

    @GetMapping
    public ResponseEntity<?> globalSearch(@RequestParam String query) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long callerId = userDetails.getId();

        // Get server IDs the caller is a member of
        java.util.Set<Long> memberServerIds = serverMemberRepository.findByUserId(callerId)
            .stream()
            .map(sm -> sm.getServer().getId())
            .collect(Collectors.toSet());

        Map<String, Object> results = new HashMap<>();
        
        // Users: search all (for discovery)
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getUsername().toLowerCase().contains(query.toLowerCase()) || 
                             (u.getProgrammingLanguages() != null && u.getProgrammingLanguages().toLowerCase().contains(query.toLowerCase())))
                .map(u -> {
                    u.setPassword(null);
                    return u;
                })
                .collect(Collectors.toList());
                
        // Servers: only those the caller is a member of
        List<Server> servers = serverRepository.findAll().stream()
                .filter(s -> memberServerIds.contains(s.getId()))
                .filter(s -> s.getName().toLowerCase().contains(query.toLowerCase()) || 
                            (s.getDescription() != null && s.getDescription().toLowerCase().contains(query.toLowerCase())))
                .collect(Collectors.toList());
                
        // Channels: only those in servers the caller is a member of
        List<Channel> channels = channelRepository.findAll().stream()
                .filter(c -> memberServerIds.contains(c.getServer().getId()))
                .filter(c -> c.getName().toLowerCase().contains(query.toLowerCase()))
                .collect(Collectors.toList());
                
        results.put("users", users);
        results.put("servers", servers);
        results.put("channels", channels);
        
        return ResponseEntity.ok(results);
    }
}
