package com.devcollab.backend.config;

import com.devcollab.backend.entity.UserStatus;
import com.devcollab.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;
import java.util.Map;

@SuppressWarnings("null")
@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null) {
            String username = (String) sessionAttributes.get("username");
            
            if (username != null) {
                userRepository.findByUsername(username).ifPresent(user -> {
                    user.setStatus(UserStatus.ONLINE);
                    user.setLastSeen(LocalDateTime.now());
                    userRepository.save(user);
                    logger.info("User Connected: " + username);
                    
                    messagingTemplate.convertAndSend("/topic/presence", Map.of(
                        "username", username,
                        "status", "ONLINE",
                        "lastSeen", user.getLastSeen()
                    ));
                });
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null) {
            String username = (String) sessionAttributes.get("username");

            if (username != null) {
                userRepository.findByUsername(username).ifPresent(user -> {
                    user.setStatus(UserStatus.OFFLINE);
                    user.setLastSeen(LocalDateTime.now());
                    userRepository.save(user);
                    logger.info("User Disconnected: " + username);
                    
                    messagingTemplate.convertAndSend("/topic/presence", Map.of(
                        "username", username,
                        "status", "OFFLINE",
                        "lastSeen", user.getLastSeen()
                    ));
                });
            }
        }
    }
}
