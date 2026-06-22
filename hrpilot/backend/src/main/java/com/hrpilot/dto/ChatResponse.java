package com.hrpilot.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatResponse {
    private String sessionId;
    private String messageId;
    private String answer;
    private String sources;      // JSON array of source chunk references
    private boolean cacheHit;
}
