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
import com.devcollab.backend.repository.SavedMessageRepository;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.entity.SavedMessage;
import com.devcollab.backend.entity.ServerRole;
import com.devcollab.backend.repository.ServerMemberRepository;
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
@SuppressWarnings("null")
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
    SavedMessageRepository savedMessageRepository;

    @Autowired
    ServerMemberRepository serverMemberRepository;

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
        ServerRole viewerRole = member.getRole();
        if (channel.isPrivate() && viewerRole != ServerRole.OWNER && viewerRole != ServerRole.ADMIN) {
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
        ServerRole senderRole = member.getRole();
        if (channel.isPrivate() && senderRole != ServerRole.OWNER && senderRole != ServerRole.ADMIN) {
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

        if (request.getParentMessageId() != null) {
            Message parent = messageRepository.findById(request.getParentMessageId()).orElse(null);
            if (parent != null) {
                message.setParentMessage(parent);
            }
        }

        if (request.getCodeContent() != null && !request.getCodeContent().isEmpty()) {
            CodeSnippet snippet = CodeSnippet.builder()
                    .codeContent(request.getCodeContent())
                    .language(request.getLanguage() != null ? request.getLanguage() : "plaintext")
                    .message(message)
                    .build();
            message.setSnippet(snippet);
        }

        Message savedMessage = messageRepository.save(message);

        return ResponseEntity.ok(savedMessage);
    }

    @PutMapping("/messages/{messageId}")
    public ResponseEntity<?> editMessage(@PathVariable Long messageId, @RequestBody java.util.Map<String, String> body) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (!msgOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Message msg = msgOpt.get();
        if (!msg.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized"));
        }
        String newContent = body.get("content");
        if (newContent != null) {
            msg.setContent(newContent);
            msg.setEdited(true);
            msg = messageRepository.save(msg);
        }
        return ResponseEntity.ok(msg);
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long messageId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (!msgOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Message msg = msgOpt.get();
        if (!msg.getUser().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized"));
        }
        messageRepository.delete(msg);
        return ResponseEntity.ok(new MessageResponse("Message deleted"));
    }

    @GetMapping("/messages/search")
    public ResponseEntity<List<Message>> searchMessages(@RequestParam String keyword) {
        List<Message> results = messageRepository.searchByKeyword(keyword);
        return ResponseEntity.ok(results);
    }

    // ── Saved Messages ────────────────────────────────────────────────────────

    @GetMapping("/messages/saved")
    public ResponseEntity<?> getSavedMessages() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<com.devcollab.backend.entity.SavedMessage> saved = savedMessageRepository.findByUserIdOrderBySavedAtDesc(userDetails.getId());
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/messages/{messageId}/save")
    public ResponseEntity<?> saveMessage(@PathVariable Long messageId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (!msgOpt.isPresent()) return ResponseEntity.notFound().build();

        // Already saved? return 200 with existing
        Optional<SavedMessage> existing = savedMessageRepository.findByUserIdAndMessageId(userDetails.getId(), messageId);
        if (existing.isPresent()) return ResponseEntity.ok(existing.get());

        User user = userRepository.findById(userDetails.getId()).orElse(null);
        if (user == null) return ResponseEntity.status(403).build();

        SavedMessage sm = SavedMessage.builder()
            .user(user)
            .message(msgOpt.get())
            .build();
        savedMessageRepository.save(sm);
        return ResponseEntity.ok(sm);
    }

    @DeleteMapping("/messages/{messageId}/save")
    public ResponseEntity<?> unsaveMessage(@PathVariable Long messageId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<SavedMessage> existing = savedMessageRepository.findByUserIdAndMessageId(userDetails.getId(), messageId);
        if (!existing.isPresent()) return ResponseEntity.notFound().build();
        savedMessageRepository.delete(existing.get());
        return ResponseEntity.ok(new MessageResponse("Message unsaved"));
    }

    // ── Message Pinning ───────────────────────────────────────────────────────

    @GetMapping("/channels/{channelId}/pinned")
    public ResponseEntity<?> getPinnedMessages(@PathVariable Long channelId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<Channel> channelOpt = channelRepository.findById(channelId);
        if (!channelOpt.isPresent()) return ResponseEntity.notFound().build();
        Long serverId = channelOpt.get().getServer().getId();
        Optional<com.devcollab.backend.entity.ServerMember> pinnedMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
        if (!pinnedMemberOpt.isPresent()) return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member"));
        List<Message> pinned = messageRepository.findByChannelIdAndIsPinnedTrue(channelId);
        return ResponseEntity.ok(pinned);
    }

    @PatchMapping("/messages/{messageId}/pin")
    public ResponseEntity<?> togglePinMessage(@PathVariable Long messageId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (!msgOpt.isPresent()) return ResponseEntity.notFound().build();
        Message msg = msgOpt.get();
        Long serverId = msg.getChannel().getServer().getId();
        Optional<com.devcollab.backend.entity.ServerMember> pinMemberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, userDetails.getId());
        if (!pinMemberOpt.isPresent()) return ResponseEntity.status(403).body(new MessageResponse("Error: Not a member"));
        ServerRole role = pinMemberOpt.get().getRole();
        if (role != ServerRole.OWNER && role != ServerRole.ADMIN) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Only OWNER or ADMIN can pin messages"));
        }
        msg.setPinned(!msg.isPinned());
        msg = messageRepository.save(msg);
        return ResponseEntity.ok(msg);
    }
}
