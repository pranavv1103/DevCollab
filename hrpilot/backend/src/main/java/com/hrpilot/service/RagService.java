package com.hrpilot.service;

import com.hrpilot.entity.DocumentChunk;
import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Retrieval-Augmented Generation (RAG) service.
 *
 * This is the core AI intelligence of HRPilot:
 *   1. Retrieve relevant policy chunks from pgvector (the "R" in RAG)
 *   2. Augment the prompt with those chunks as context (the "A" in RAG)
 *   3. Generate an answer using GPT-4o-mini (the "G" in RAG)
 *
 * Beginners' note:
 * Without RAG, the AI would answer from general knowledge and might be wrong
 * or hallucinate policies. With RAG, we give it YOUR company's actual policy
 * documents as context, so answers are grounded in real HR policies.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    private static final int TOP_K = 5;

    private final VectorSearchService vectorSearchService;
    private final ChatLanguageModel chatLanguageModel;

    public record RagResult(String answer, String sourcesJson) {}

    public RagResult answer(String question, UUID companyId) {
        // Step 1: Find the most relevant policy chunks
        List<DocumentChunk> relevantChunks = vectorSearchService.search(question, companyId, TOP_K);

        if (relevantChunks.isEmpty()) {
            return new RagResult(
                    "I could not find relevant policy information in your company's documents. " +
                    "Please ensure HR policies have been uploaded and indexed.",
                    "[]"
            );
        }

        // Step 2: Build context from retrieved chunks
        String context = relevantChunks.stream()
                .map(c -> "--- Policy Section (Page " + c.getPageNumber() + ") ---\n" + c.getContent())
                .collect(Collectors.joining("\n\n"));

        // Step 3: Craft the prompt with the retrieved context
        String prompt = """
                You are HRPilot, an expert HR Compliance Assistant.
                Answer the employee's question using ONLY the policy sections provided below.
                If the answer is not in the policies, say so clearly.
                Always cite which policy section your answer comes from.
                
                COMPANY POLICY SECTIONS:
                %s
                
                EMPLOYEE QUESTION: %s
                
                Answer:""".formatted(context, question);

        // Step 4: Call GPT-4o-mini
        String answer;
        try {
            answer = chatLanguageModel.generate(prompt);
        } catch (Exception e) {
            log.error("LLM call failed: {}", e.getMessage());
            answer = "I encountered an error processing your question. Please try again.";
        }

        // Step 5: Build sources JSON for the response
        String sourcesJson = relevantChunks.stream()
                .map(c -> "{\"chunkId\":\"" + c.getId() + "\",\"documentId\":\"" + c.getDocumentId() +
                          "\",\"page\":" + c.getPageNumber() + "}")
                .collect(Collectors.joining(",", "[", "]"));

        return new RagResult(answer, sourcesJson);
    }
}
