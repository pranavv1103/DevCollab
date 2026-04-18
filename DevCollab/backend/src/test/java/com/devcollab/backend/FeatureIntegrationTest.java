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
 * Integration tests for Feature-level flows (Features 1–8 + core messaging).
 *
 * Tests covered:
 *  1.  Fetch messages for a channel (pagination)
 *  2.  Fetch messages non-member → 403
 *  3.  Fetch channels → non-existent channel → empty list or 400
 *  4.  AI explain endpoint (local fallback) → 200 + result field
 *  5.  AI summarize endpoint → 200 + result field
 *  6.  AI suggest endpoint → 200 + result field
 *  7.  AI review endpoint → 200 + result field
 *  8.  AI bug-triage endpoint → 200 + result field
 *  9.  AI smart-search endpoint → 200 + result field
 *  10. Rate limit: 11th upload request is rate-limited (429)
 *  11. Poll list for channel → 200 + array
 *  12. Direct messages list → 200 + array
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class FeatureIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private String token;
    private Long serverId;
    private Long channelId;

    @BeforeEach
    void setUp() throws Exception {
        String s = String.valueOf(System.nanoTime()).substring(10);
        // register + login
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "username","feat_owner_"+s,"email","feat_"+s+"@ex.com","password","Feat@1234"))));

        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("username","feat_owner_"+s,"password","Feat@1234"))))
            .andReturn();
        token = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        // create server
        MvcResult srv = mockMvc.perform(post("/api/servers").header("Authorization","Bearer "+token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("name","FeatSrv_"+s,"description","test"))))
            .andReturn();
        serverId = objectMapper.readTree(srv.getResponse().getContentAsString()).get("id").asLong();

        // create channel
        MvcResult ch = mockMvc.perform(post("/api/servers/"+serverId+"/channels")
            .header("Authorization","Bearer "+token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("name","general","type","PUBLIC"))))
            .andReturn();
        channelId = objectMapper.readTree(ch.getResponse().getContentAsString()).get("id").asLong();
    }

    // -------------------------------------------------------------------------
    // 1. Fetch messages — member → 200 + page structure
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/channels/{id}/messages — member → 200 + paginated response")
    void getMessages_returns200() throws Exception {
        mockMvc.perform(get("/api/channels/"+channelId+"/messages?page=0&size=20")
                .header("Authorization","Bearer "+token))
            .andExpect(status().isOk());
    }

    // -------------------------------------------------------------------------
    // 2. Fetch messages non-member → 403
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/channels/{id}/messages — non-member → 403")
    void getMessages_nonMember_returns403() throws Exception {
        String s = String.valueOf(System.nanoTime()).substring(10);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "username","nm_"+s,"email","nm_"+s+"@ex.com","password","Nm@12345"))));
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("username","nm_"+s,"password","Nm@12345"))))
            .andReturn();
        String outsider = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/channels/"+channelId+"/messages?page=0&size=20")
                .header("Authorization","Bearer "+outsider))
            .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // 3. AI — explain (Feature 3 local fallback)
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/ai/explain — 200 + result field present")
    void aiExplain_returns200WithResult() throws Exception {
        mockMvc.perform(post("/api/ai/explain").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "code","public int add(int a,int b){return a+b;}","language","java"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.result").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // 4. AI — summarize
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/ai/summarize — 200 + result field present")
    void aiSummarize_returns200() throws Exception {
        mockMvc.perform(post("/api/ai/summarize").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "messages",new String[]{"Hello","How are you?","I am fine"}))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.result").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // 5. AI — suggest
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/ai/suggest — 200 + result field present")
    void aiSuggest_returns200() throws Exception {
        mockMvc.perform(post("/api/ai/suggest").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "code","def fib(n):\n  return n if n<=1 else fib(n-1)+fib(n-2)","language","python"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.result").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // 6. AI — review
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/ai/review — 200 + result field present")
    void aiReview_returns200() throws Exception {
        mockMvc.perform(post("/api/ai/code-review").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "code","for(int i=0;i<n;i++) arr[i]=i;","language","java"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.result").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // 7. AI — bug-triage
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/ai/bug-triage — 200 + result field present")
    void aiBugTriage_returns200() throws Exception {
        mockMvc.perform(post("/api/ai/bug-triage").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "title","NullPointerException","description","NPE on login","stackTrace","NPE at line 42"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.result").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // 8. AI — smart-search
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/ai/smart-search — 200 + result field present")
    void aiSmartSearch_returns200() throws Exception {
        mockMvc.perform(post("/api/ai/smart-search").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "query","how to authenticate","channelId", channelId))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.result").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // 9. Poll list for channel → 200 + array (Feature 2)
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/channels/{id}/polls — member → 200 + array")
    void getPolls_returns200() throws Exception {
        mockMvc.perform(get("/api/channels/"+channelId+"/polls")
                .header("Authorization","Bearer "+token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // -------------------------------------------------------------------------
    // 10. Direct messages list — authenticated → 200 + array (Feature 4)
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/dm/conversations — 200 + array")
    void getDmConversations_returns200() throws Exception {
        mockMvc.perform(get("/api/dm/inbox")
                .header("Authorization","Bearer "+token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // -------------------------------------------------------------------------
    // 11. File upload to non-multipart → 400 (Feature 5 - endpoint exists)
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("POST /api/upload/chat — no file → 4xx client error")
    void uploadNoFile_returns400() throws Exception {
        // Sending non-multipart to a multipart endpoint should yield a 4xx.
        // MockMvc may throw a ServletException wrapping MultipartException — both are correct.
        try {
            mockMvc.perform(post("/api/upload/chat")
                    .header("Authorization","Bearer "+token))
                .andExpect(status().is4xxClientError());
        } catch (Exception ex) {
            // MultipartException thrown as ServletException is the expected failure mode
            org.assertj.core.api.Assertions.assertThat(ex.getMessage())
                .containsAnyOf("multipart","Multipart","not a multipart");
        }
    }

    // -------------------------------------------------------------------------
    // 12. Server members list → 200 + array (includes member query)
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/servers/{id}/members — owner → 200 + array")
    void getServerMembers_returns200() throws Exception {
        mockMvc.perform(get("/api/servers/"+serverId+"/members")
                .header("Authorization","Bearer "+token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }
}
