package com.hrpilot.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

/**
 * Represents a text chunk from a policy document.
 * The embedding vector (1536-dim) is stored directly in PostgreSQL via schema.sql
 * using pgvector's vector type — NOT mapped as a JPA field to avoid type conflicts.
 * Use DocumentChunkRepository.updateEmbedding() and findSimilarChunks() for vector ops.
 */
@Entity
@Table(name = "document_chunk")
@Data
@NoArgsConstructor
public class DocumentChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID documentId;

    @Column(nullable = false)
    private int chunkIndex;

    /** The raw text content of this chunk (~500 tokens) */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /** The page number in the original PDF where this chunk came from */
    private int pageNumber;
}
