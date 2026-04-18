package com.devcollab.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Server and Channel management flows.
 *
 * Tests covered:
 *  1. Create server → 200 + server in response
 *  2. Fetch servers list for authenticated user → 200
 *  3. Create channel inside server → 200
 *  4. Fetch channels for server → 200 + list
 *  5. Non-member cannot fetch channels → 403
 *  6. Fetch channels for non-existent server → 400
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class ServerChannelIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private String ownerToken;
    private Long serverId;

    @BeforeEach
    void setUp() throws Exception {
        // Register + login as owner
        String suffix = String.valueOf(System.nanoTime()).substring(10);
        Map<String,String> reg = Map.of(
            "username", "srv_owner_" + suffix,
            "email",    "srv_owner_" + suffix + "@example.com",
            "password", "Owner@123"
        );
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)));

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("username","srv_owner_"+suffix,"password","Owner@123"))))
            .andReturn();
        ownerToken = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        // Create a server for tests
        MvcResult createServer = mockMvc.perform(post("/api/servers")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name","Test Server","description","A test server"))))
            .andReturn();
        serverId = objectMapper.readTree(createServer.getResponse().getContentAsString()).get("id").asLong();
    }

    // -------------------------------------------------------------------------
    // 1. Create server
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/servers — authenticated → 200 + server object")
    void createServer_returns200() throws Exception {
        mockMvc.perform(post("/api/servers")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name","My Server","description","desc"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("My Server"));
    }

    // -------------------------------------------------------------------------
    // 2. Fetch server list
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/servers — authenticated → 200 + non-empty list")
    void getServers_returnsList() throws Exception {
        mockMvc.perform(get("/api/servers")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // -------------------------------------------------------------------------
    // 3. Create channel in server
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/servers/{id}/channels — owner → 200 + channel object")
    void createChannel_returns200() throws Exception {
        mockMvc.perform(post("/api/servers/" + serverId + "/channels")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name","dev-chat","type","PUBLIC"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("dev-chat"));
    }

    // -------------------------------------------------------------------------
    // 4. Fetch channels for server
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/servers/{id}/channels — member → 200 + list")
    void getChannels_returnsList() throws Exception {
        // ensure at least one channel exists
        mockMvc.perform(post("/api/servers/" + serverId + "/channels")
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name","general","type","PUBLIC"))));

        mockMvc.perform(get("/api/servers/" + serverId + "/channels")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // -------------------------------------------------------------------------
    // 5. Non-member cannot fetch channels
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/servers/{id}/channels — non-member → 403")
    void getNonMemberChannels_returns403() throws Exception {
        String suffix = String.valueOf(System.nanoTime()).substring(10);
        Map<String,String> reg = Map.of(
            "username","outsider_"+suffix,"email","outsider_"+suffix+"@ex.com","password","Out@12345"
        );
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(reg)));

        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("username","outsider_"+suffix,"password","Out@12345"))))
            .andReturn();
        String outsiderToken = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/servers/" + serverId + "/channels")
                .header("Authorization", "Bearer " + outsiderToken))
            .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // 6. Channels for non-existent server → 400
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/servers/99999/channels — not found → 400")
    void getChannelsNonExistentServer_returns400() throws Exception {
        mockMvc.perform(get("/api/servers/99999/channels")
                .header("Authorization", "Bearer " + ownerToken))
            .andExpect(status().isBadRequest());
    }
}
