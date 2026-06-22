package com.hrpilot.controller;

import com.hrpilot.dto.AuthResponse;
import com.hrpilot.dto.GoogleAuthRequest;
import com.hrpilot.dto.LoginRequest;
import com.hrpilot.dto.RegisterRequest;
import com.hrpilot.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST endpoints for authentication.
 *
 * POST /api/v1/auth/register  → create account, return JWT
 * POST /api/v1/auth/login     → verify credentials, return JWT
 *
 * Both endpoints are public (no token required) — see SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleAuth(@Valid @RequestBody GoogleAuthRequest req) {
        return ResponseEntity.ok(authService.googleAuth(req.getCredential()));
    }
}
