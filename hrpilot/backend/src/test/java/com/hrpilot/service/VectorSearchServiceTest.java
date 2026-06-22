package com.hrpilot.service;

import com.hrpilot.entity.DocumentChunk;
import com.hrpilot.repository.DocumentChunkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for VectorSearchService.
 *
 * Beginners' note:
 * Mockito allows us to replace real dependencies with "mock" objects.
 * We tell the mock "when this method is called with these args, return this value".
 * This means we test ONLY VectorSearchService logic, not the database or AI.
 */
@ExtendWith(MockitoExtension.class)
class VectorSearchServiceTest {

    @Mock
    private DocumentChunkRepository chunkRepository;

    @Mock
    private EmbeddingService embeddingService;

    @InjectMocks
    private VectorSearchService vectorSearchService;

    private DocumentChunk sampleChunk;

    @BeforeEach
    void setUp() {
        sampleChunk = new DocumentChunk();
        sampleChunk.setDocumentId(UUID.randomUUID());
        sampleChunk.setContent("FMLA allows eligible employees to take 12 weeks of unpaid leave.");
        sampleChunk.setChunkIndex(0);
        sampleChunk.setPageNumber(1);
    }

    @Test
    void search_returnsChunks() {
        float[] mockEmbedding = new float[1536];
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);
        when(chunkRepository.findSimilarChunks(anyString(), anyString(), anyInt()))
                .thenReturn(List.of(sampleChunk));

        List<DocumentChunk> results = vectorSearchService.search("FMLA leave", UUID.randomUUID(), 5);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getContent()).contains("FMLA");
    }

    @Test
    void search_emptyWhenNoResults() {
        float[] mockEmbedding = new float[1536];
        when(embeddingService.embed(anyString())).thenReturn(mockEmbedding);
        when(chunkRepository.findSimilarChunks(anyString(), anyString(), anyInt()))
                .thenReturn(List.of());

        List<DocumentChunk> results = vectorSearchService.search("unknown topic", UUID.randomUUID(), 5);

        assertThat(results).isEmpty();
    }
}
