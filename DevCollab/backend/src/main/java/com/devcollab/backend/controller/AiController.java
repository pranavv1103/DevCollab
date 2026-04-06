package com.devcollab.backend.controller;

import com.devcollab.backend.dto.request.AiRequest;
import com.devcollab.backend.dto.response.AiResponse;
import com.devcollab.backend.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @PostMapping("/explain")
    public ResponseEntity<AiResponse> explainCode(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.explainCode(request));
    }

    @PostMapping("/summarize")
    public ResponseEntity<AiResponse> summarizeChat(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.summarizeChat(request));
    }

    @PostMapping("/suggest")
    public ResponseEntity<AiResponse> suggestImprovements(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.suggestImprovements(request));
    }
    
    @PostMapping("/standup")
    public ResponseEntity<AiResponse> generateStandup(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.generateStandup(request));
    }

    @PostMapping("/bug-triage")
    public ResponseEntity<AiResponse> triageBug(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.triageBug(request));
    }

    @PostMapping("/code-review")
    public ResponseEntity<AiResponse> reviewCode(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.reviewCode(request));
    }

    @PostMapping("/meeting-notes")
    public ResponseEntity<AiResponse> extractMeetingNotes(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.extractMeetingNotes(request));
    }

    @PostMapping("/smart-search")
    public ResponseEntity<AiResponse> smartSearch(@RequestBody AiRequest request) {
        return ResponseEntity.ok(aiService.smartSearch(request));
    }
}
