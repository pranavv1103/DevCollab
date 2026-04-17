package com.devcollab.backend.controller;

import com.devcollab.backend.dto.request.MessageRequest;
import com.devcollab.backend.dto.request.TypingIndicator;
import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.CodeSnippet;
import com.devcollab.backend.entity.Message;
import com.devcollab.backend.entity.ServerRole;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.MessageRepository;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.service.PermissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.devcollab.backend.entity.Notification;
import com.devcollab.backend.entity.Reaction;
import com.devcollab.backend.repository.NotificationRepository;
import com.devcollab.backend.repository.ReactionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.transaction.annotation.Transactional;

@Controller
@SuppressWarnings("null")
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);
    private static final Pattern MENTION_PATTERN = Pattern.compile("@(\\w+)");

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ReactionRepository reactionRepository;

    @Autowired
    private com.devcollab.backend.repository.ServerMemberRepository serverMemberRepository;

    @Autowired
    private PermissionService permissionService;

    @MessageMapping("/chat.sendMessage/{channelId}")
    @Transactional
    public void sendMessage(@DestinationVariable Long channelId,
                            @Payload MessageRequest messageRequest,
                            SimpMessageHeaderAccessor headerAccessor) {
        
        // For WebSockets, passing JWT as query param or interceptor is common.
        // Assuming user string is stored in session attributes from a ChannelInterceptor during STOMP connect.
        // For simplicity in this demo, you might just accept it fully mapped if authentication is already intercepted.
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            logger.error("Session attributes missing for WebSocket message");
            return;
        }
        String username = (String) sessionAttributes.get("username");
        
        if (username == null) {
            logger.error("Unauthorized WebSocket message attempt");
            return;
        }

        User sender = userRepository.findByUsername(username).orElse(null);
        Channel channel = channelRepository.findById(channelId).orElse(null);

        if (sender != null && channel != null) {
            java.util.Optional<com.devcollab.backend.entity.ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(channel.getServer().getId(), sender.getId());
            if (!memberOpt.isPresent()) {
                logger.error("Forbidden STOMP: non-member attempted to send to channel {}", channelId);
                return;
            }

            ServerRole senderRole = memberOpt.get().getRole();
            if (!permissionService.canSendMessage(senderRole, channel)) {
                logger.warn("Forbidden STOMP: role {} cannot send to channel {} (type={})", senderRole, channelId, channel.getChannelType());
                return;
            }
            Message parentMessage = null;
            if (messageRequest.getParentMessageId() != null) {
                // Use JOIN FETCH to eagerly load the parent's user (needed for broadcast payload)
                parentMessage = messageRepository.findByIdWithUser(messageRequest.getParentMessageId()).orElse(null);
            }

            Message message = Message.builder()
                    .content(messageRequest.getContent())
                    .channel(channel)
                    .user(sender)
                    .parentMessage(parentMessage)
                    .attachmentUrl(messageRequest.getAttachmentUrl())
                    .attachmentName(messageRequest.getAttachmentName())
                    .timestamp(LocalDateTime.now())
                    .build();

            if (messageRequest.getCodeContent() != null && !messageRequest.getCodeContent().isEmpty()) {
                CodeSnippet snippet = CodeSnippet.builder()
                        .codeContent(messageRequest.getCodeContent())
                        .language(messageRequest.getLanguage() != null ? messageRequest.getLanguage() : "plaintext")
                        .message(message)
                        .build();
                message.setSnippet(snippet);
            }

            Message savedMessage = messageRepository.save(message);

            // Build a plain Map payload for STOMP broadcast.
            // Broadcasting a Hibernate entity directly risks LazyInitializationException
            // if Jackson accesses un-initialized proxies after the session closes.
            // Using a Map with explicitly-set values is always safe.
            Map<String, Object> broadcastPayload = buildBroadcastPayload(savedMessage, sender, parentMessage);

            // Broadcast FIRST — before any notification work that could throw.
            // This guarantees the sender always sees their own message regardless of
            // notification failures.
            messagingTemplate.convertAndSend("/topic/channels/" + channelId, broadcastPayload);

            // Generate reply notification — wrapped in try-catch so failures never
            // roll back the message save or suppress the already-sent broadcast.
            try {
                if (parentMessage != null && !parentMessage.getUser().getId().equals(sender.getId())) {
                    Long parentUserId = parentMessage.getUser().getId();
                    Notification replyNotif = Notification.builder()
                        .type("REPLY")
                        .content(sender.getUsername() + " replied to your message in #" + channel.getName())
                        .relatedEntityId(channel.getId())
                        .createdAt(LocalDateTime.now())
                        .build();
                    // Set user by ID reference to avoid any proxy/cascade issues
                    User parentAuthor = userRepository.findById(parentUserId).orElse(null);
                    if (parentAuthor != null) {
                        replyNotif.setUser(parentAuthor);
                        notificationRepository.save(replyNotif);
                        Map<String, Object> notifPayload = new java.util.LinkedHashMap<>();
                        notifPayload.put("id", replyNotif.getId());
                        notifPayload.put("type", replyNotif.getType());
                        notifPayload.put("content", replyNotif.getContent());
                        notifPayload.put("relatedEntityId", replyNotif.getRelatedEntityId());
                        notifPayload.put("read", false);
                        messagingTemplate.convertAndSend("/topic/user/" + parentUserId + "/notifications", notifPayload);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to create reply notification (message was still saved and broadcast)", e);
            }

            // Parse mentions and create notifications
            try {
                if (savedMessage.getContent() != null && !savedMessage.getContent().isEmpty()) {
                    Matcher matcher = MENTION_PATTERN.matcher(savedMessage.getContent());
                    while (matcher.find()) {
                        String mentionedUsername = matcher.group(1);
                        User mentionedUser = userRepository.findByUsername(mentionedUsername).orElse(null);
                        if (mentionedUser != null && !mentionedUser.getId().equals(sender.getId())) {
                            Notification mentionNotif = Notification.builder()
                                .user(mentionedUser)
                                .type("MENTION")
                                .content("You were mentioned in #" + channel.getName() + " by " + sender.getUsername())
                                .relatedEntityId(channel.getId())
                                .createdAt(LocalDateTime.now())
                                .build();
                            notificationRepository.save(mentionNotif);
                            Map<String, Object> notifPayload = new java.util.LinkedHashMap<>();
                            notifPayload.put("id", mentionNotif.getId());
                            notifPayload.put("type", mentionNotif.getType());
                            notifPayload.put("content", mentionNotif.getContent());
                            notifPayload.put("relatedEntityId", mentionNotif.getRelatedEntityId());
                            notifPayload.put("read", false);
                            messagingTemplate.convertAndSend("/topic/user/" + mentionedUser.getId() + "/notifications", notifPayload);
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to create mention notification (message was still saved and broadcast)", e);
            }
        }
    }

    /**
     * Builds a plain Map from a saved Message for STOMP broadcast.
     * Using a Map avoids Hibernate lazy-proxy serialization issues — all values
     * are read within the active transaction and stored as plain Java types.
     */
    private Map<String, Object> buildBroadcastPayload(Message msg, User sender, Message parentMessage) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", msg.getId());
        m.put("content", msg.getContent());
        m.put("timestamp", msg.getTimestamp() != null ? msg.getTimestamp().toString() : null);
        m.put("edited", false);
        m.put("pinned", false);

        // sender is already fully loaded — no proxy risk
        Map<String, Object> u = new java.util.LinkedHashMap<>();
        u.put("id", sender.getId());
        u.put("username", sender.getUsername());
        u.put("profilePictureUrl", sender.getProfilePictureUrl());
        m.put("user", u);

        // parentMessage was loaded via findByIdWithUser → its user is eagerly fetched
        if (parentMessage != null && parentMessage.getUser() != null) {
            Map<String, Object> pm = new java.util.LinkedHashMap<>();
            pm.put("id", parentMessage.getId());
            pm.put("content", parentMessage.getContent());
            Map<String, Object> pu = new java.util.LinkedHashMap<>();
            pu.put("id", parentMessage.getUser().getId());
            pu.put("username", parentMessage.getUser().getUsername());
            pu.put("profilePictureUrl", parentMessage.getUser().getProfilePictureUrl());
            pm.put("user", pu);
            m.put("parentMessage", pm);
        } else {
            m.put("parentMessage", null);
        }

        // snippet was cascaded with the save, so msg.getSnippet() is the object we just set
        if (msg.getSnippet() != null) {
            Map<String, Object> sn = new java.util.LinkedHashMap<>();
            sn.put("codeContent", msg.getSnippet().getCodeContent());
            sn.put("language", msg.getSnippet().getLanguage());
            m.put("snippet", sn);
        } else {
            m.put("snippet", null);
        }

        m.put("attachmentUrl", msg.getAttachmentUrl());
        m.put("attachmentName", msg.getAttachmentName());
        m.put("reactions", java.util.Collections.emptyList());
        return m;
    }

    @MessageMapping("/chat.editMessage/{channelId}")
    @Transactional
    public void editMessage(@DestinationVariable Long channelId,
                            @Payload Map<String, Object> payload,
                            SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            logger.error("Session attributes missing for WebSocket message");
            return;
        }
        String username = (String) sessionAttributes.get("username");
        if (username == null) return;
        
        Object msgIdObj = payload.get("messageId");
        if (msgIdObj == null) return;
        Long messageId = Long.valueOf(msgIdObj.toString());
        String newContent = (String) payload.get("content");
        
        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (msgOpt.isPresent()) {
            Message msg = msgOpt.get();
            if (msg.getUser().getUsername().equals(username)) {
                msg.setContent(newContent);
                msg.setEdited(true);
                Message savedMessage = messageRepository.save(msg);
                messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/edits", savedMessage);
            }
        }
    }

    @MessageMapping("/chat.deleteMessage/{channelId}")
    @Transactional
    public void deleteMessage(@DestinationVariable Long channelId,
                              @Payload Map<String, Object> payload,
                              SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            logger.error("Session attributes missing for WebSocket message");
            return;
        }
        String username = (String) sessionAttributes.get("username");
        if (username == null) return;
        
        Object msgIdObj = payload.get("messageId");
        if (msgIdObj == null) return;
        Long messageId = Long.valueOf(msgIdObj.toString());
        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (msgOpt.isPresent()) {
            Message msg = msgOpt.get();
            User actor = userRepository.findByUsername(username).orElse(null);
            if (actor == null) return;
            // Determine the actor's server role for moderation purposes
            java.util.Optional<com.devcollab.backend.entity.ServerMember> actorMember =
                serverMemberRepository.findByServerIdAndUserId(msg.getChannel().getServer().getId(), actor.getId());
            ServerRole actorRole = actorMember.map(m -> m.getRole()).orElse(null);
            if (actorRole != null && permissionService.canDeleteMessage(actorRole, actor.getId(), msg.getUser().getId())) {
                messageRepository.delete(msg);
                messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/deletes", Map.of("messageId", messageId));
            } else {
                logger.warn("Forbidden STOMP delete: {} tried to delete message {}", username, messageId);
            }
        }
    }

    @MessageMapping("/chat.typing/{channelId}")
    @Transactional(readOnly = true)
    public void typing(@DestinationVariable Long channelId,
                       @Payload TypingIndicator payload,
                       SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            logger.error("Session attributes missing for WebSocket message");
            return;
        }
        String username = (String) sessionAttributes.get("username");
        if (username == null) return;
        
        payload.setUsername(username);
        messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/typing", payload);
    }

    @MessageMapping("/chat.react/{channelId}")
    @Transactional
    public void reactMessage(@DestinationVariable Long channelId,
                             @Payload Map<String, Object> payload,
                             SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            logger.error("Session attributes missing for WebSocket message");
            return;
        }
        String username = (String) sessionAttributes.get("username");
        if (username == null) return;

        Object msgIdObj = payload.get("messageId");
        if (msgIdObj == null) return;
        Long messageId = Long.valueOf(msgIdObj.toString());
        String emoji = (String) payload.get("emoji");
        if (emoji == null || emoji.isBlank()) return;

        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (msgOpt.isPresent()) {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                Message message = msgOpt.get();
                // Toggle: if this user already reacted with the same emoji, remove it; otherwise add it.
                List<Reaction> existing = reactionRepository.findByMessageId(messageId);
                java.util.Optional<Reaction> alreadyReacted = existing.stream()
                    .filter(r -> r.getUser().getId().equals(user.getId()) && r.getEmoji().equals(emoji))
                    .findFirst();

                if (alreadyReacted.isPresent()) {
                    reactionRepository.delete(alreadyReacted.get());
                    payload.put("removed", true);
                } else {
                    Reaction reaction = Reaction.builder()
                        .message(message)
                        .user(user)
                        .emoji(emoji)
                        .build();
                    reactionRepository.save(reaction);
                    payload.put("removed", false);
                }
                payload.put("username", username);
                // Re-fetch full updated reactions list and broadcast
                List<Reaction> updatedReactions = reactionRepository.findByMessageId(messageId);
                Map<String, Object> broadcast = new java.util.HashMap<>();
                broadcast.put("messageId", messageId);
                broadcast.put("reactions", updatedReactions);
                messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/reactions", broadcast);
            }
        }
    }
}
