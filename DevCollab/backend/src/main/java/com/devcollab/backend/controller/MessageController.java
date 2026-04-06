package com.devcollab.backend.controller;

import com.devcollab.backend.dto.request.MessageRequest;
import com.devcollab.backend.dto.response.MessageResponse;
import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.CodeSnippet;
import com.devcollab.backend.entity.Message;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.CodeSnippetRepository;
import com.devcollab.backend.repository.MessageRepository;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class MessageController {

    @Autowired
    MessageRepository messageRepository;

    @Autowired
    ChannelRepository channelRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    CodeSnippetRepository codeSnippetRepository;

    @Autowired
    com.devcollab.backend.repository.ServerMemberRepository serverMemberRepository;

    @GetMapping("/channels/{channelId}/messages")
    public ResponseEntity<?> getMessagesByChannel(
            @PathVariable Long channelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        Optional<Channel> channelOpt = channelRepository.findById(channelId);
        if (!channelOpt.isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Channel not found"));
        }
        
        Channel channel = channelOpt.get();
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<com.devcollab.backend.entity.ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(channel.getServer().getId(), userDetails.getId());
        
        if (!memberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member of this server"));
        }
        
        com.devcollab.backend.entity.ServerMember member = memberOpt.get();
        if (channel.isPrivate() && !(String.valueOf(member.getRole()).equals("OWNER") || String.valueOf(member.getRole()).equals("ADMIN"))) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to view private channel messages"));
        }

        Page<Message> messages = messageRepository.findByChannelIdOrderByTimestampDesc(channelId, PageRequest.of(page, size));
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/channels/{channelId}/messages")
    public ResponseEntity<?> sendMessage(@PathVariable Long channelId, @RequestBody MessageRequest request) {
        Optional<Channel> channelOpt = channelRepository.findById(channelId);
        
        if (!channelOpt.isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Channel not found"));
        }
        
        Channel channel = channelOpt.get();
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<com.devcollab.backend.entity.ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(channel.getServer().getId(), userDetails.getId());
        
        if (!memberOpt.isPresent()) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member of this server"));
        }
        
        com.devcollab.backend.entity.ServerMember member = memberOpt.get();
        if (channel.isPrivate() && !(String.valueOf(member.getRole()).equals("OWNER") || String.valueOf(member.getRole()).equals("ADMIN"))) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to send messages in private channel"));
        }

        User sender = userRepository.findById(userDetails.getId()).orElse(null);

        if (sender == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: User not found"));
        }

        Message message = Message.builder()
                .content(request.getContent())
                .channel(channelOpt.get())
                .user(sender)
                .timestamp(LocalDateTime.now())
                .build();

        if (request.getCodeContent() != null && !request.getCodeContent().isEmpty()) {
            CodeSnippet snippet = CodeSnippet.builder()
                    .codeContent(request.getCodeContent())
                    .language(request.getLanguage() != null ? request.getLanguage() : "plaintext")
                    .message(message)
                    .build();
            message.setSnippet(snippet);
        }

        Message savedMessage = messageRepository.save(message);
        
        // TODO: Broadcast to WebSocket when that is implemented
        
        return ResponseEntity.ok(savedMessage);
    }

    @GetMapping("/messages/search")
    public ResponseEntity<List<Message>> searchMessages(@RequestParam String keyword) {
        List<Message> results = messageRepository.searchByKeyword(keyword);
        return ResponseEntity.ok(results);
    }
}
