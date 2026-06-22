package com.hrpilot.event;

import java.util.UUID;

/**
 * Kafka event published when a new HR policy PDF is uploaded.
 * The consumer reads this and starts the PDF → chunk → embed → store pipeline.
 *
 * Using a record for immutability — records are a modern Java 16+ feature.
 */
public record DocumentUploadedEvent(
        UUID documentId,
        String filePath,
        UUID companyId,
        UUID uploadedBy
) {}
