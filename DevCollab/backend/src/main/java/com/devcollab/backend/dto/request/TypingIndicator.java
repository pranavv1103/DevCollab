package com.devcollab.backend.dto.request;

import lombok.Data;

@Data
public class TypingIndicator {
    private String username;
    private boolean isTyping;
}
