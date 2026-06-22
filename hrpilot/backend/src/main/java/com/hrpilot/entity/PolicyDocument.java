package com.hrpilot.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents an uploaded HR policy PDF document.
 * Each document belongs to a company and has a processing status.
 */
@Entity
@Table(name = "policy_document")
@Data
@NoArgsConstructor
public class PolicyDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The filename used for storage on disk (UUID-based, unique) */
    @Column(nullable = false)
    private String fileName;

    /** The original filename provided by the user */
    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private UUID companyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @Column(nullable = false)
    private UUID uploadedBy;

    private int chunkCount;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
        if (status == null) status = DocumentStatus.PENDING;
    }
}
