package com.hrpilot.repository;

import com.hrpilot.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    List<DocumentChunk> findByDocumentIdOrderByChunkIndex(UUID documentId);

    long countByDocumentId(UUID documentId);

    /**
     * Find the topK most similar chunks to the given query embedding using pgvector
     * cosine distance (<=> operator). Only chunks from INDEXED documents of the
     * given company are returned.
     *
     * @param embedding  the query embedding in pgvector text format "[x1,x2,...]"
     * @param companyId  UUID of the company (as string for native query binding)
     * @param limit      maximum number of results
     */
    @Query(value = "SELECT dc.id, dc.document_id, dc.chunk_index, dc.content, dc.page_number " +
            "FROM document_chunk dc " +
            "JOIN policy_document pd ON dc.document_id = pd.id " +
            "WHERE pd.company_id = CAST(:companyId AS uuid) " +
            "AND pd.status = 'INDEXED' " +
            "AND dc.embedding IS NOT NULL " +
            "ORDER BY dc.embedding <=> CAST(:embedding AS vector) " +
            "LIMIT :limit",
            nativeQuery = true)
    List<DocumentChunk> findSimilarChunks(
            @Param("embedding") String embedding,
            @Param("companyId") String companyId,
            @Param("limit") int limit);

    /**
     * Store a float[] embedding for a specific chunk via native SQL,
     * casting the vector-format string to the pgvector type.
     *
     * @param id         the chunk UUID as string
     * @param embedding  the embedding in pgvector format "[x1,x2,...]"
     */
    @Modifying
    @Transactional
    @Query(value = "UPDATE document_chunk SET embedding = CAST(:embedding AS vector) WHERE id = CAST(:id AS uuid)",
            nativeQuery = true)
    void updateEmbedding(@Param("id") String id, @Param("embedding") String embedding);
}
