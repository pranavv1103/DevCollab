package com.devcollab.backend.controller;

import com.devcollab.backend.dto.response.MessageResponse;
import com.devcollab.backend.entity.User;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    UserRepository userRepository;

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserProfile(@PathVariable Long id) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setPassword(null); // Simple way to hide password, normally use a DTO
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<?> updateUserProfile(@PathVariable Long id, @RequestBody User profileUpdates) {
        // Basic authorization check
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!userDetails.getId().equals(id)) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to modify this profile"));
        }

        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (profileUpdates.getProgrammingLanguages() != null) {
                user.setProgrammingLanguages(profileUpdates.getProgrammingLanguages());
            }
            if (profileUpdates.getGithubUrl() != null) {
                user.setGithubUrl(profileUpdates.getGithubUrl());
            }
            if (profileUpdates.getBio() != null) {
                user.setBio(profileUpdates.getBio());
            }
            if (profileUpdates.getLinkedinUrl() != null) {
                user.setLinkedinUrl(profileUpdates.getLinkedinUrl());
            }
            if (profileUpdates.getPortfolioUrl() != null) {
                user.setPortfolioUrl(profileUpdates.getPortfolioUrl());
            }
            if (profileUpdates.getThemePreference() != null) {
                user.setThemePreference(profileUpdates.getThemePreference());
            }
            if (profileUpdates.getProfilePictureUrl() != null) {
                user.setProfilePictureUrl(profileUpdates.getProfilePictureUrl());
            }
            if (profileUpdates.getBio() != null) {
                user.setBio(profileUpdates.getBio());
            }
            userRepository.save(user);
            return ResponseEntity.ok(new MessageResponse("Profile updated successfully!"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/avatar")
    public ResponseEntity<?> uploadAvatar(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!userDetails.getId().equals(id)) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: Unauthorized to modify this profile"));
        }

        try {
            String uploadDir = "uploads/avatars/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String newFilename = "user_" + id + "_" + System.currentTimeMillis() + extension;
            
            Path filePath = uploadPath.resolve(newFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            Optional<User> userOptional = userRepository.findById(id);
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                // Assumes we expose /uploads as static resource in Spring
                String avatarUrl = "/uploads/avatars/" + newFilename;
                user.setProfilePictureUrl(avatarUrl);
                userRepository.save(user);
                return ResponseEntity.ok(new MessageResponse(avatarUrl));
            } else {
                return ResponseEntity.notFound().build();
            }

        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body(new MessageResponse("Could not store image"));
        }
    }
}
