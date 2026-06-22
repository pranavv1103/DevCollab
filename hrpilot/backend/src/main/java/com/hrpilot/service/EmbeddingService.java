package com.hrpilot.service;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Wraps the LangChain4j EmbeddingModel to convert text into float[] vectors.
 *
 * Beginners' note:
 * An "embedding" is a list of 1536 numbers (for text-embedding-3-small) that captures
 * the semantic meaning of a text. Two sentences with similar meanings will have
 * embedding vectors that are "close" to each other in geometric space.
 */
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;

    /**
     * Convert a text string into a 1536-dimensional float vector.
     */
    public float[] embed(String text) {
        Response<Embedding> response = embeddingModel.embed(text);
        return response.content().vector();
    }

    /**
     * Format a float[] into pgvector's text format "[x1,x2,...,xN]".
     * Used for native SQL queries with the vector type.
     */
    public static String toVectorString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vector[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}
