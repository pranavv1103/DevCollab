package com.hrpilot.service;

import com.hrpilot.entity.DocumentStatus;
import com.hrpilot.entity.PolicyDocument;
import com.hrpilot.event.DocumentUploadedEvent;
import com.hrpilot.repository.PolicyDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

/**
 * Handles document upload and retrieval.
 *
 * Upload flow:
 *   1. Save file to local disk (uploads/ directory)
 *   2. Save metadata to PostgreSQL with status=PENDING
 *   3. Publish a Kafka event → triggers async ingestion
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    @Value("${app.uploads.directory:uploads}")
    private String uploadsDir;

    private final PolicyDocumentRepository documentRepository;
    private final KafkaTemplate<String, DocumentUploadedEvent> kafkaTemplate;

    public PolicyDocument uploadDocument(MultipartFile file, UUID companyId, UUID uploadedBy) throws IOException {
        // Resolve upload directory to an absolute path so it's consistent across contexts
        Path uploadPath = Paths.get(uploadsDir).toAbsolutePath();
        Files.createDirectories(uploadPath);

        // Store file with a UUID filename to avoid collisions
        String storedFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(storedFileName);
        Files.copy(file.getInputStream(), filePath);

        // Persist metadata
        PolicyDocument doc = new PolicyDocument();
        doc.setFileName(storedFileName);
        doc.setOriginalName(file.getOriginalFilename());
        doc.setCompanyId(companyId);
        doc.setUploadedBy(uploadedBy);
        doc.setStatus(DocumentStatus.PENDING);
        doc = documentRepository.save(doc);

        // Publish Kafka event for async ingestion (best-effort — upload succeeds even if Kafka is unavailable)
        try {
            DocumentUploadedEvent event = new DocumentUploadedEvent(
                    doc.getId(), filePath.toAbsolutePath().toString(), companyId, uploadedBy);
            kafkaTemplate.send("document.uploaded", doc.getId().toString(), event);
            log.info("Published document.uploaded event for doc {}", doc.getId());
        } catch (Exception e) {
            log.warn("Kafka unavailable — document {} saved but ingestion event not published: {}", doc.getId(), e.getMessage());
        }

        return doc;
    }

    public List<PolicyDocument> getDocuments(UUID companyId) {
        return documentRepository.findByCompanyId(companyId);
    }

    public PolicyDocument getDocument(UUID documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));
    }

    public List<PolicyDocument> searchDocuments(UUID companyId, String query) {
        return documentRepository.findByCompanyIdAndOriginalNameContainingIgnoreCase(companyId, query);
    }
}
