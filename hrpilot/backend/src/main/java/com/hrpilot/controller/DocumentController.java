package com.hrpilot.controller;

import com.hrpilot.entity.PolicyDocument;
import com.hrpilot.security.JwtUtil;
import com.hrpilot.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for HR policy document management.
 *
 * POST /api/v1/documents/upload   → upload a PDF (ADMIN only, enforced in SecurityConfig)
 * GET  /api/v1/documents          → list documents for the caller's company
 * GET  /api/v1/documents/{id}     → get a specific document + its status
 */
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final JwtUtil jwtUtil;

    @PostMapping("/upload")
    public ResponseEntity<PolicyDocument> upload(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authHeader) throws IOException {

        String token = authHeader.substring(7);
        UUID companyId = jwtUtil.extractCompanyId(token);
        UUID userId = jwtUtil.extractUserId(token);

        PolicyDocument doc = documentService.uploadDocument(file, companyId, userId);
        return ResponseEntity.ok(doc);
    }

    @GetMapping
    public ResponseEntity<List<PolicyDocument>> listDocuments(
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.substring(7);
        UUID companyId = jwtUtil.extractCompanyId(token);
        return ResponseEntity.ok(documentService.getDocuments(companyId));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<PolicyDocument> getStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getDocument(id));
    }
}
