package com.hrpilot.dto;

import com.hrpilot.entity.UserRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String token;
    private String userId;
    private String email;
    private UserRole role;
    private String companyId;
}
