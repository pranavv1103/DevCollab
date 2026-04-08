package com.devcollab.backend.config;

import com.devcollab.backend.security.jwt.JwtUtils;
import com.devcollab.backend.entity.Channel;
import com.devcollab.backend.entity.ServerMember;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.ChannelRepository;
import com.devcollab.backend.repository.ServerMemberRepository;
import com.devcollab.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;

import org.springframework.stereotype.Component;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SuppressWarnings("null")
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private ServerMemberRepository serverMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                if (jwtUtils.validateJwtToken(token)) {
                    String username = jwtUtils.getUserNameFromJwtToken(token);
                    Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
                    if (sessionAttributes == null) {
                        sessionAttributes = new java.util.HashMap<>();
                        accessor.setSessionAttributes(sessionAttributes);
                    }
                    sessionAttributes.put("username", username);
                    logger.info("WebSocket CONNECT authenticated: user='{}'", username);
                } else {
                    logger.warn("WebSocket CONNECT: JWT validation failed");
                }
            } else {
                logger.warn("WebSocket CONNECT: missing or malformed Authorization header");
            }
        } else if (accessor != null && StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/channels/")) {
                try {
                    String[] parts = destination.split("/");
                    if (parts.length > 3) {
                        Long channelId = Long.valueOf(parts[3]);
                        Channel targetChannel = channelRepository.findById(channelId).orElse(null);
                        if (targetChannel != null && targetChannel.isPrivate()) {
                            Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
                            if (sessionAttributes == null || sessionAttributes.get("username") == null) {
                                throw new IllegalArgumentException("Unauthorized subscription attempt to private channel");
                            }
                            String username = (String) sessionAttributes.get("username");
                            User user = userRepository.findByUsername(username).orElse(null);
                            if (user != null) {
                                java.util.Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(targetChannel.getServer().getId(), user.getId());
                                if (!memberOpt.isPresent()) {
                                    throw new IllegalArgumentException("Not a member of the server");
                                }
                                ServerMember member = memberOpt.get();
                                if (!(String.valueOf(member.getRole()).equals("OWNER") || String.valueOf(member.getRole()).equals("ADMIN"))) {
                                    throw new IllegalArgumentException("Unauthorized: Admin or Owner only for private channels");
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    throw new IllegalArgumentException("Invalid channel subscription");
                }
            }
        }
        return message;
    }
}
