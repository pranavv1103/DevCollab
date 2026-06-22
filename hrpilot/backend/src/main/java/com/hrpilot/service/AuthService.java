package com.hrpilot.service;

import com.hrpilot.dto.AuthResponse;
import com.hrpilot.dto.LoginRequest;
import com.hrpilot.dto.RegisterRequest;
import com.hrpilot.entity.User;
import com.hrpilot.entity.UserRole;
import com.hrpilot.repository.UserRepository;
import com.hrpilot.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${app.google.client-id}")
    private String googleClientId;

    // Default company for Google OAuth sign-ups (can be made dynamic later)
    private static final UUID DEFAULT_COMPANY_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

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

    /**
     * Verify a Google ID token via Google's tokeninfo endpoint,
     * then find or auto-create the user.
     */
    public AuthResponse googleAuth(String credential) {
        // Verify the token with Google
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential;
        RestTemplate restTemplate = new RestTemplate();

        @SuppressWarnings("unchecked")
        Map<String, Object> tokenInfo = restTemplate.getForObject(url, Map.class);

        if (tokenInfo == null || tokenInfo.containsKey("error")) {
            throw new BadCredentialsException("Invalid Google token");
        }

        // Verify the audience matches our client ID
        String aud = (String) tokenInfo.get("aud");
        if (!googleClientId.equals(aud)) {
            throw new BadCredentialsException("Google token audience mismatch");
        }

        String email = (String) tokenInfo.get("email");
        if (email == null) {
            throw new BadCredentialsException("Google token missing email");
        }

        // Find existing user or auto-register as EMPLOYEE
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            log.info("Auto-registering Google user: {}", email);
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            newUser.setRole(UserRole.EMPLOYEE);
            newUser.setCompanyId(DEFAULT_COMPANY_ID);
            return userRepository.save(newUser);
        });

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
