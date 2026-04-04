package com.devcollab.backend.controller;

import com.devcollab.backend.dto.request.MessageRequest;
import com.devcollab.backend.dto.request.TypingIndicator;
import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.CodeSnippet;
import com.devcollab.backend.entity.Message;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.MessageRepository;
import com.devcollab.backend.repository.UserRepository;
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
import com.devcollab.backend.repository.NotificationRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Controller
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

    @MessageMapping("/chat.sendMessage/{channelId}")
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
            Message parentMessage = null;
            if (messageRequest.getParentMessageId() != null) {
                parentMessage = messageRepository.findById(messageRequest.getParentMessageId()).orElse(null);
            }

            Message message = Message.builder()
                    .content(messageRequest.getContent())
                    .channel(channel)
                    .user(sender)
                    .parentMessage(parentMessage)
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

            // Generate reply notification
            if (parentMessage != null && !parentMessage.getUser().getId().equals(sender.getId())) {
                Notification replyNotif = Notification.builder()
                    .user(parentMessage.getUser())
                    .type("REPLY")
                    .content(sender.getUsername() + " replied to your message in #" + channel.getName())
                    .relatedEntityId(channel.getId())
                    .createdAt(LocalDateTime.now())
                    .build();
                notificationRepository.save(replyNotif);
                messagingTemplate.convertAndSend("/topic/user/" + parentMessage.getUser().getId() + "/notifications", replyNotif);
            }

            // Parse mentions and create notifications
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
                        messagingTemplate.convertAndSend("/topic/user/" + mentionedUser.getId() + "/notifications", mentionNotif);
                    }
                }
            }

            // Broadcast the saved message uniquely to that channel subscriber topic
            messagingTemplate.convertAndSend("/topic/channels/" + channelId, savedMessage);
        }
    }

    @MessageMapping("/chat.editMessage/{channelId}")
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
            if (msg.getUser().getUsername().equals(username)) {
                messageRepository.delete(msg);
                messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/deletes", Map.of("messageId", messageId));
            }
        }
    }

    @MessageMapping("/chat.typing/{channelId}")
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
        
        Optional<Message> msgOpt = messageRepository.findById(messageId);
        if (msgOpt.isPresent()) {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user != null) {
                // If it exists, toggle it off. Otherwise add it.
                // For simplicity, we just add it to the reactions array in this demo.
                // Since this isn't fully built out in repository, we'll just broadcast the UI intent.
                // E.g. messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/reactions", payload);
                // A mature system would save `Reaction` entity to `ReactionRepository`.
                payload.put("username", username);
                messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/reactions", payload);
            }
        }
    }
}
