package com.devcollab.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;

/**
 * Receives GitHub webhook events and broadcasts them to connected clients
 * via WebSocket so the team can see repo activity in real-time.
 *
 * Setup: in GitHub repo → Settings → Webhooks → add
 *   Payload URL : https://your-domain/api/webhooks/github
 *   Content type: application/json
 *   Secret      : set GITHUB_WEBHOOK_SECRET env var to match
 *   Events      : push, pull_request, issues (or "send me everything")
 */
@RestController
@RequestMapping("/api/webhooks")
public class GitHubWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(GitHubWebhookController.class);

    @Value("${github.webhook.secret:}")
    private String webhookSecret;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/github")
    public ResponseEntity<Void> handleGitHubEvent(
            @RequestHeader(value = "X-GitHub-Event", defaultValue = "ping") String event,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String rawBody) {

        // Verify HMAC-SHA256 signature when secret is configured
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (signature == null || !verifySignature(rawBody, signature)) {
                logger.warn("GitHub webhook signature verification failed");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        }

        if ("ping".equals(event)) {
            logger.info("GitHub webhook ping received — connection established");
            return ResponseEntity.ok().build();
        }

        Map<String, Object> payload = buildPayload(event, rawBody);
        // Broadcast to all connected clients on /topic/github
        messagingTemplate.convertAndSend("/topic/github", payload);
        logger.info("GitHub {} event broadcast to /topic/github", event);

        return ResponseEntity.ok().build();
    }

    private boolean verifySignature(String body, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            String expected = "sha256=" + HexFormat.of().formatHex(digest);
            // Constant-time comparison to prevent timing attacks
            return constantTimeEquals(expected, signature);
        } catch (Exception e) {
            logger.error("Failed to verify GitHub webhook signature", e);
            return false;
        }
    }

    /** Constant-time string comparison to mitigate timing side-channels */
    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private Map<String, Object> buildPayload(String event, String rawBody) {
        // Pass the raw JSON body as a string; the frontend will parse it
        return Map.of("event", event, "body", rawBody);
    }
}
