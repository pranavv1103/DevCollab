package com.devcollab.backend.controller;

import com.devcollab.backend.dto.response.MessageResponse;
import com.devcollab.backend.entity.Notification;
import com.devcollab.backend.repository.NotificationRepository;
import com.devcollab.backend.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<?> getUserNotifications() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userDetails.getId());
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<Notification> notifOpt = notificationRepository.findById(notificationId);
        
        if (notifOpt.isPresent()) {
            Notification notif = notifOpt.get();
            if (notif.getUser().getId().equals(userDetails.getId())) {
                notif.setRead(true);
                notificationRepository.save(notif);
                return ResponseEntity.ok(notif);
            }
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized."));
        }
        return ResponseEntity.notFound().build();
    }
    
    @PutMapping("/readAll")
    public ResponseEntity<?> markAllAsRead() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userDetails.getId());
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(new MessageResponse("All notifications marked as read."));
    }
}
