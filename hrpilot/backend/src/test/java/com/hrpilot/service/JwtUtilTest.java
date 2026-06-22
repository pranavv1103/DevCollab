package com.hrpilot.service;

import com.hrpilot.entity.User;
import com.hrpilot.entity.UserRole;
import com.hrpilot.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for JwtUtil.
 * Tests token generation, validation, and claim extraction without Spring context.
 */
class JwtUtilTest {

    private JwtUtil jwtUtil;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "test-jwt-secret-key-must-be-at-least-32-chars-long");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 86400000L);

        testUser = new User();
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());
        testUser.setEmail("admin@acme.com");
        testUser.setRole(UserRole.ADMIN);
        testUser.setCompanyId(UUID.randomUUID());
    }

    @Test
    void generateToken_isValid() {
        String token = jwtUtil.generateToken(testUser);
        assertThat(token).isNotBlank();
        assertThat(jwtUtil.isTokenValid(token)).isTrue();
    }

    @Test
    void extractEmail_fromToken() {
        String token = jwtUtil.generateToken(testUser);
        assertThat(jwtUtil.extractEmail(token)).isEqualTo("admin@acme.com");
    }

    @Test
    void extractRole_fromToken() {
        String token = jwtUtil.generateToken(testUser);
        assertThat(jwtUtil.extractRole(token)).isEqualTo("ADMIN");
    }

    @Test
    void extractCompanyId_fromToken() {
        String token = jwtUtil.generateToken(testUser);
        assertThat(jwtUtil.extractCompanyId(token)).isEqualTo(testUser.getCompanyId());
    }

    @Test
    void invalidToken_isNotValid() {
        assertThat(jwtUtil.isTokenValid("not.a.valid.token")).isFalse();
    }
}
