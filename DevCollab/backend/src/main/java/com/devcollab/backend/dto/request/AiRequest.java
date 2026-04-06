package com.devcollab.backend.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class AiRequest {
    private String codeSnippet;
    private String language;
    private List<String> chatMessages;
    private String searchQuery;
}
