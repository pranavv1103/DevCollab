package com.hrpilot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatRequest {

    @NotBlank
    private String question;

    /** UUID of an existing session, or null to start a new session */
    private String sessionId;
}
