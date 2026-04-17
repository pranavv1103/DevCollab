package com.devcollab.backend.controller;

import com.devcollab.backend.dto.response.MessageResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
            ".pdf", ".txt", ".md",
            ".js", ".ts", ".java", ".py", ".go", ".rs", ".cpp", ".c", ".cs", ".rb",
            ".zip", ".tar", ".gz"
    );
    private static final Set<String> ALLOWED_MIME_PREFIXES = Set.of(
            "image/", "text/", "application/pdf", "application/zip",
            "application/x-tar", "application/gzip", "application/octet-stream"
    );

    @PostMapping("/chat")
    public ResponseEntity<?> uploadChatFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("No file provided"));
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(new MessageResponse("File exceeds 20 MB limit"));
        }

        String rawName = file.getOriginalFilename();
        String originalFilename = StringUtils.cleanPath(rawName != null ? rawName : "upload");

        // Validate extension
        String ext = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase()
                : "";
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.badRequest().body(new MessageResponse("File type not allowed"));
        }

        // Validate content type
        String rawContentType = file.getContentType();
        String contentType = (rawContentType != null) ? rawContentType : "";
        boolean mimeAllowed = ALLOWED_MIME_PREFIXES.stream().anyMatch(contentType::startsWith);
        if (!mimeAllowed) {
            return ResponseEntity.badRequest().body(new MessageResponse("File MIME type not allowed"));
        }

        try {
            String uploadDir = "uploads/chat/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String newFilename = UUID.randomUUID() + ext;
            Path filePath = uploadPath.resolve(newFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/chat/" + newFilename;
            return ResponseEntity.ok(Map.of(
                    "url", fileUrl,
                    "name", originalFilename,
                    "type", contentType
            ));
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body(new MessageResponse("Could not store file"));
        }
    }
}
