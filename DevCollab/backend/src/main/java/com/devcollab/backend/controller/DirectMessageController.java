package com.devcollab.backend.controller;

import com.devcollab.backend.entity.DirectMessage;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.DirectMessageRepository;
import com.devcollab.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@SuppressWarnings("null")
public class DirectMessageController {

    @Autowired
    private DirectMessageRepository dmRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // ── REST ──────────────────────────────────────────────────────────────────

    /** Get conversation history between current user and another */
    @GetMapping("/api/dm/{otherUserId}")
    @ResponseBody
    public ResponseEntity<List<DirectMessage>> getConversation(
            @PathVariable Long otherUserId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = userRepository.findByUsername(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(dmRepository.findConversation(me.getId(), otherUserId));
    }

    /** Mark all messages from a sender as read */
    @PostMapping("/api/dm/{senderId}/read")
    @ResponseBody
    public ResponseEntity<Void> markRead(
            @PathVariable Long senderId,
            @AuthenticationPrincipal UserDetails principal) {
        User me = userRepository.findByUsername(principal.getUsername()).orElseThrow();
        dmRepository.markAllReadFromSender(me.getId(), senderId);
        return ResponseEntity.ok().build();
    }

    /** Get DM inbox — list of conversation partners with last message and unread count */
    @GetMapping("/api/dm/inbox")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getInbox(
            @AuthenticationPrincipal UserDetails principal) {
        User me = userRepository.findByUsername(principal.getUsername()).orElseThrow();
        List<Long> partnerIds = dmRepository.findConversationPartnerIds(me.getId());
        List<Map<String, Object>> inbox = partnerIds.stream().map(partnerId -> {
            User partner = userRepository.findById(partnerId).orElse(null);
            if (partner == null) return null;
            List<DirectMessage> history = dmRepository.findConversation(me.getId(), partnerId);
            DirectMessage last = history.isEmpty() ? null : history.get(history.size() - 1);
            long unread = dmRepository.countUnreadFromSender(me.getId(), partnerId);
            Map<String, Object> entry = new HashMap<>();
            entry.put("partnerId", partnerId);
            entry.put("partnerName", partner.getUsername());
            entry.put("partnerAvatar", partner.getProfilePictureUrl());
            entry.put("lastMessage", last == null ? null : last.getContent());
            entry.put("lastTimestamp", last == null ? null : last.getTimestamp());
            entry.put("unread", unread);
            return entry;
        }).filter(e -> e != null).toList();
        return ResponseEntity.ok(inbox);
    }

    /** Search users (for starting a new DM) */
    @GetMapping("/api/dm/users/search")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> searchUsers(
            @RequestParam String q,
            @AuthenticationPrincipal UserDetails principal) {
        List<User> users = userRepository.findByUsernameContainingIgnoreCase(q);
        List<Map<String, Object>> result = users.stream()
                .filter(u -> !u.getUsername().equals(principal.getUsername()))
                .limit(20)
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("avatarUrl", u.getProfilePictureUrl());
                    return m;
                }).toList();
        return ResponseEntity.ok(result);
    }

    // ── WebSocket ─────────────────────────────────────────────────────────────

    @MessageMapping("/dm.send")
    public void sendDm(@Payload Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) return;
        String senderUsername = (String) sessionAttributes.get("username");
        if (senderUsername == null) return;

        User sender = userRepository.findByUsername(senderUsername).orElse(null);
        if (sender == null) return;

        Long recipientId = Long.valueOf(payload.get("recipientId").toString());
        String content = (String) payload.get("content");
        if (content == null || content.isBlank()) return;

        User recipient = userRepository.findById(recipientId).orElse(null);
        if (recipient == null) return;

        DirectMessage dm = DirectMessage.builder()
                .sender(sender)
                .recipient(recipient)
                .content(content.trim())
                .timestamp(LocalDateTime.now())
                .read(false)
                .build();
        dm = dmRepository.save(dm);

        // Push to both participants' personal topics
        messagingTemplate.convertAndSend("/topic/dm/" + recipientId, dm);
        messagingTemplate.convertAndSend("/topic/dm/" + sender.getId(), dm);
    }
}
