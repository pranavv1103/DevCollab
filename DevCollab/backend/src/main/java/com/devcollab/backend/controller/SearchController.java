package com.devcollab.backend.controller;

import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.Server;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.MessageRepository;
import com.devcollab.backend.repository.ServerRepository;
import com.devcollab.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    @GetMapping
    public ResponseEntity<?> globalSearch(@RequestParam String query) {
        Map<String, Object> results = new HashMap<>();
        
        // Very basic wildcard search - in production, Postgres Full Text Search or ElasticSearch would be used
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getUsername().toLowerCase().contains(query.toLowerCase()) || 
                             (u.getProgrammingLanguages() != null && u.getProgrammingLanguages().toLowerCase().contains(query.toLowerCase())))
                .map(u -> {
                    u.setPassword(null);
                    return u;
                })
                .collect(Collectors.toList());
                
        List<Server> servers = serverRepository.findAll().stream()
                .filter(s -> s.getName().toLowerCase().contains(query.toLowerCase()) || 
                            (s.getDescription() != null && s.getDescription().toLowerCase().contains(query.toLowerCase())))
                .collect(Collectors.toList());
                
        List<Channel> channels = channelRepository.findAll().stream()
                .filter(c -> c.getName().toLowerCase().contains(query.toLowerCase()))
                .collect(Collectors.toList());
                
        results.put("users", users);
        results.put("servers", servers);
        results.put("channels", channels);
        
        return ResponseEntity.ok(results);
    }
}
