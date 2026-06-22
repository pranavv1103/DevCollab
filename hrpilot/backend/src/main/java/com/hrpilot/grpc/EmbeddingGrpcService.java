package com.hrpilot.grpc;

import com.hrpilot.service.EmbeddingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * gRPC service implementation for embedding generation.
 *
 * This is a placeholder implementation that uses our existing EmbeddingService.
 * The actual generated proto classes (EmbeddingServiceGrpc.EmbeddingServiceImplBase)
 * are generated during the Maven build phase from embedding.proto.
 *
 * Beginners' note:
 * gRPC is like REST but uses binary Protocol Buffers (protobuf) instead of JSON.
 * It's faster and more efficient for internal service-to-service communication.
 * The protobuf compiler generates Java code from the .proto file automatically.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingGrpcService {

    private final EmbeddingService embeddingService;

    /**
     * Embed a single text string.
     * Called by gRPC clients via the generated stub.
     */
    public float[] generateEmbedding(String text) {
        log.debug("gRPC: generating embedding for text of length {}", text.length());
        return embeddingService.embed(text);
    }

    /**
     * Embed a batch of texts (more efficient than calling one by one).
     */
    public float[][] generateBatchEmbeddings(String[] texts) {
        float[][] results = new float[texts.length][];
        for (int i = 0; i < texts.length; i++) {
            results[i] = embeddingService.embed(texts[i]);
        }
        return results;
    }
}
