package com.hrpilot.controller;

import com.hrpilot.agent.HrComplianceAgent;
import com.hrpilot.dto.AgentRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST endpoint for the tool-calling AI Agent.
 *
 * Unlike the RAG chat which only retrieves documents, the agent can:
 * - Autonomously decide which tools to call
 * - Combine tool results with policy lookups
 * - Handle structured HR calculations (FMLA, PTO, remote work)
 *
 * POST /api/v1/agent/ask
 */
@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
public class AgentController {

    private final HrComplianceAgent hrComplianceAgent;

    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> ask(@Valid @RequestBody AgentRequest req) {
        String context = req.getContext() != null ? req.getContext() : "No additional context provided";
        String answer = hrComplianceAgent.chat(req.getQuestion(), context);
        return ResponseEntity.ok(Map.of("answer", answer));
    }
}
