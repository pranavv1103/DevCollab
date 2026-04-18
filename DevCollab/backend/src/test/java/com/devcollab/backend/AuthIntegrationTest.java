package com.devcollab.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for authentication flows.
 *
 * Tests covered:
 *  1. Register a new user → 200 + success message
 *  2. Register duplicate username → 400
 *  3. Login with valid credentials → 200 + JWT token present
 *  4. Login with wrong password → 401
 *  5. Protected endpoint without token → 401
 *  6. Protected endpoint with valid token → 200
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class AuthIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    // -------------------------------------------------------------------------
    // 1. Register new user
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/auth/register — new user → 200 + success message")
    void registerNewUser_returns200() throws Exception {
        Map<String,String> req = Map.of(
            "username", "testuser_auth",
            "email",    "testuser_auth@example.com",
            "password", "Test@123"
        );

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("User registered successfully!"));
    }

    // -------------------------------------------------------------------------
    // 2. Register duplicate username → 400
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/auth/register — duplicate username → 400")
    void registerDuplicateUsername_returns400() throws Exception {
        Map<String,String> req = Map.of(
            "username", "dupuser_auth",
            "email",    "dup1@example.com",
            "password", "Test@123"
        );
        // register first time
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk());

        // register again with same username — should fail
        Map<String,String> req2 = Map.of(
            "username", "dupuser_auth",
            "email",    "dup2@example.com",
            "password", "Test@123"
        );
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Error: Username is already taken!"));
    }

    // -------------------------------------------------------------------------
    // 3. Login valid → JWT token in response
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/auth/login — valid credentials → 200 + token")
    void loginValidCredentials_returnsToken() throws Exception {
        // first register so the user exists in H2
        Map<String,String> reg = Map.of(
            "username", "loginuser",
            "email",    "loginuser@example.com",
            "password", "MyPass@1"
        );
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
            .andExpect(status().isOk());

        Map<String,String> login = Map.of("username", "loginuser", "password", "MyPass@1");
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.username").value("loginuser"))
            .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
        assertThat(token).isNotBlank().startsWith("eyJ"); // JWT always starts with eyJ
    }

    // -------------------------------------------------------------------------
    // 4. Login wrong password → 401
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/auth/login — wrong password → 401")
    void loginWrongPassword_returns401() throws Exception {
        Map<String,String> reg = Map.of(
            "username", "wrongpwduser",
            "email",    "wrongpwd@example.com",
            "password", "Correct@1"
        );
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
            .andExpect(status().isOk());

        Map<String,String> login = Map.of("username", "wrongpwduser", "password", "WrongPass");
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // 5. Protected endpoint without token → 401
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/servers — no token → 401")
    void protectedEndpointNoToken_returns401() throws Exception {
        mockMvc.perform(get("/api/servers"))
            .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // 6. Protected endpoint with valid token → 200
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/servers — valid token → 200")
    void protectedEndpointWithToken_returns200() throws Exception {
        // register + login to get token
        Map<String,String> reg = Map.of(
            "username", "tokenuser",
            "email",    "tokenuser@example.com",
            "password", "Token@123"
        );
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
            .andExpect(status().isOk());

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username","tokenuser","password","Token@123"))))
            .andExpect(status().isOk())
            .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/servers")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }
}
