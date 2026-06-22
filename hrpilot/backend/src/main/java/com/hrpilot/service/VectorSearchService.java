package com.hrpilot.service;

import com.hrpilot.entity.DocumentChunk;
import com.hrpilot.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Searches for document chunks semantically similar to a query using pgvector.
 *
 * Beginners' note:
 * Vector search works by:
 *   1. Converting the user's question into an embedding (1536 numbers).
 *   2. Finding chunks whose embeddings are "close" (low cosine distance) to the query.
 *   3. These "close" chunks are the most semantically relevant policy sections.
 *
 * The <=> operator in PostgreSQL is the pgvector cosine distance operator.
 */
@Service
@RequiredArgsConstructor
public class VectorSearchService {

    private final DocumentChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;

    /**
     * Find up to {@code topK} chunks most relevant to the query from the given company's documents.
     */
    public List<DocumentChunk> search(String query, UUID companyId, int topK) {
        float[] queryEmbedding = embeddingService.embed(query);
        String vectorStr = EmbeddingService.toVectorString(queryEmbedding);
        return chunkRepository.findSimilarChunks(vectorStr, companyId.toString(), topK);
    }
}
