package com.hrpilot.service;

import com.hrpilot.dto.AuthResponse;
import com.hrpilot.dto.LoginRequest;
import com.hrpilot.dto.RegisterRequest;
import com.hrpilot.entity.User;
import com.hrpilot.repository.UserRepository;
import com.hrpilot.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Handles registration and login.
 *
 * Beginners' note:
 * - Passwords are stored hashed using BCrypt (one-way), never in plain text.
 * - On login we verify with passwordEncoder.matches(), not by decrypting.
 * - JWTs are signed with a secret key; the server verifies the signature on each request.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole());
        user.setCompanyId(UUID.fromString(req.getCompanyId()));
        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        return buildResponse(user, token);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user);
        return buildResponse(user, token);
    }

    private AuthResponse buildResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId().toString())
                .email(user.getEmail())
                .role(user.getRole())
                .companyId(user.getCompanyId().toString())
                .build();
    }
}
