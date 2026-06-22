package com.hrpilot.service;

import com.hrpilot.entity.DocumentChunk;
import com.hrpilot.service.RagService.RagResult;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RagServiceTest {

    @Mock
    private VectorSearchService vectorSearchService;

    @Mock
    private ChatLanguageModel chatLanguageModel;

    @InjectMocks
    private RagService ragService;

    @Test
    void answer_withChunks_returnsAnswer() {
        DocumentChunk chunk = new DocumentChunk();
        chunk.setDocumentId(UUID.randomUUID());
        chunk.setContent("Employees are entitled to 12 weeks FMLA leave.");
        chunk.setPageNumber(1);

        when(vectorSearchService.search(anyString(), any(UUID.class), anyInt()))
                .thenReturn(List.of(chunk));
        when(chatLanguageModel.generate(anyString()))
                .thenReturn("Based on company policy, you are entitled to 12 weeks of FMLA leave.");

        RagResult result = ragService.answer("How much FMLA leave do I get?", UUID.randomUUID());

        assertThat(result.answer()).contains("12 weeks");
        assertThat(result.sourcesJson()).startsWith("[");
    }

    @Test
    void answer_noChunks_returnsNotFoundMessage() {
        when(vectorSearchService.search(anyString(), any(UUID.class), anyInt()))
                .thenReturn(List.of());

        RagResult result = ragService.answer("What is the pizza policy?", UUID.randomUUID());

        assertThat(result.answer()).containsIgnoringCase("could not find");
        assertThat(result.sourcesJson()).isEqualTo("[]");
    }
}
