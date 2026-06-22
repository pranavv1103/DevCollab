package com.hrpilot.service;

import com.hrpilot.entity.DocumentChunk;
import com.hrpilot.entity.DocumentStatus;
import com.hrpilot.entity.PolicyDocument;
import com.hrpilot.event.DocumentUploadedEvent;
import com.hrpilot.repository.DocumentChunkRepository;
import com.hrpilot.repository.PolicyDocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Kafka consumer that processes uploaded PDFs in the background.
 *
 * Pipeline for each uploaded document:
 *   1. Read PDF → extract text per page using PDFBox
 *   2. Split text into overlapping chunks (~2000 chars each)
 *   3. Call OpenAI text-embedding-3-small for each chunk
 *   4. Store chunk + embedding in PostgreSQL (pgvector column)
 *   5. Update document status to INDEXED (or FAILED on error)
 *
 * Beginners' note:
 * This runs asynchronously — the HTTP upload returns immediately, and this
 * consumer processes the file in the background. Kafka ensures we don't lose
 * the message even if the service restarts mid-processing.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentIngestionConsumer {

    private static final int CHUNK_SIZE = 2000;     // ~500 tokens
    private static final int CHUNK_OVERLAP = 200;

    private final PolicyDocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;

    @KafkaListener(topics = "document.uploaded", groupId = "hrpilot-group",
            containerFactory = "kafkaListenerContainerFactory")
    public void consume(DocumentUploadedEvent event) {
        log.info("Processing document: {}", event.documentId());

        PolicyDocument doc = documentRepository.findById(event.documentId())
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + event.documentId()));

        doc.setStatus(DocumentStatus.PROCESSING);
        documentRepository.save(doc);

        try {
            List<DocumentChunk> chunks = extractChunks(event.filePath(), event.documentId());
            int chunkIndex = 0;
            for (DocumentChunk chunk : chunks) {
                chunk = chunkRepository.save(chunk);   // get the UUID assigned by DB
                try {
                    float[] embedding = embeddingService.embed(chunk.getContent());
                    String vectorStr = EmbeddingService.toVectorString(embedding);
                    chunkRepository.updateEmbedding(chunk.getId().toString(), vectorStr);
                } catch (Exception e) {
                    log.warn("Failed to embed chunk {} of doc {}: {}", chunkIndex, event.documentId(), e.getMessage());
                }
                chunkIndex++;
            }

            doc.setStatus(DocumentStatus.INDEXED);
            doc.setChunkCount(chunks.size());
            documentRepository.save(doc);
            log.info("Document {} indexed with {} chunks", event.documentId(), chunks.size());

        } catch (Exception e) {
            log.error("Failed to process document {}: {}", event.documentId(), e.getMessage(), e);
            doc.setStatus(DocumentStatus.FAILED);
            documentRepository.save(doc);
        }
    }

    private List<DocumentChunk> extractChunks(String filePath, java.util.UUID documentId) throws Exception {
        List<DocumentChunk> chunks = new ArrayList<>();
        try (PDDocument pdf = Loader.loadPDF(new File(filePath))) {
            PDFTextStripper stripper = new PDFTextStripper();
            int totalPages = pdf.getNumberOfPages();
            int chunkIdx = 0;

            for (int page = 1; page <= totalPages; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String pageText = stripper.getText(pdf).trim();
                if (pageText.isEmpty()) continue;

                List<String> pageChunks = splitIntoChunks(pageText);
                for (String text : pageChunks) {
                    DocumentChunk chunk = new DocumentChunk();
                    chunk.setDocumentId(documentId);
                    chunk.setChunkIndex(chunkIdx++);
                    chunk.setContent(text);
                    chunk.setPageNumber(page);
                    chunks.add(chunk);
                }
            }
        }
        return chunks;
    }

    private List<String> splitIntoChunks(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());
            // Try to break at a sentence boundary to keep context coherent
            if (end < text.length()) {
                int lastPeriod = text.lastIndexOf(". ", end);
                if (lastPeriod > start + CHUNK_SIZE / 2) {
                    end = lastPeriod + 1;
                }
            }
            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty()) {
                chunks.add(chunk);
            }
            start = end - CHUNK_OVERLAP;
            if (start <= 0) start = end;
        }
        return chunks;
    }
}
