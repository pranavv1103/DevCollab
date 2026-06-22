package com.hrpilot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AgentRequest {
    @NotBlank
    private String question;

    /** Optional: employee context (tenure, job title, etc.) */
    private String context;
}
