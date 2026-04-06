package com.devcollab.backend.service;

import com.devcollab.backend.dto.request.AiRequest;
import com.devcollab.backend.dto.response.AiResponse;
import org.springframework.stereotype.Service;

@Service
public class AiService {

    public AiResponse explainCode(AiRequest request) {
        String lang = request.getLanguage() != null ? request.getLanguage() : "unknown";
        int codeLength = request.getCodeSnippet() != null ? request.getCodeSnippet().length() : 0;
        
        String explanation = "Here is an explanation for the " + lang + " code you provided (" + codeLength + " characters).\n\n" +
                "The code appears to define a specific abstract syntax tree, potentially handling logic operations " +
                "or rendering elements based on the structural context of " + lang + ". \n\n" +
                "(Note: This is a simulated local response. Insert an OpenAI API key in AiService.java for real AI inference).";
        return new AiResponse(explanation);
    }

    public AiResponse summarizeChat(AiRequest request) {
        int messageCount = request.getChatMessages() != null ? request.getChatMessages().size() : 0;
        
        // Grab a few words from the latest message to make the summary look dynamic
        String contextSnippet = "";
        if (messageCount > 0) {
           String lastWord = request.getChatMessages().get(messageCount - 1);
           contextSnippet = " Specifically, the latest topic touched on: '" + lastWord.substring(0, Math.min(lastWord.length(), 30)) + "...'.";
        }
        
        String summary = "Summary of the last " + messageCount + " messages in this channel.\n\n" +
                "The participants collaborated on various project requirements and shared " +
                "relevant technical snippets." + contextSnippet + "\n\n" +
                "(Note: This is a randomized local summary. Real integration requires an LLM API Key.)";
        return new AiResponse(summary);
    }

    public AiResponse suggestImprovements(AiRequest request) {
        String lang = request.getLanguage() != null ? request.getLanguage() : "the";
        String suggestion = "Suggestions for " + lang + " Code:\n\n" +
                "1. Consider refactoring to improve modularity.\n" +
                "2. Extracting complex nested logic into smaller, reusable methods could help.\n" +
                "3. Ensure your " + lang + " code implements proper error handling pathways.\n\n" +
                "(Note: Local mock response enabled).";
        return new AiResponse(suggestion);
    }
    
    public AiResponse generateStandup(AiRequest request) {
        String summary = "### Daily Standup Summary\n\n" +
                "- **Key Contributors:** Alice, Bob, Charlie\n" +
                "- **Major Topics:** DB Refactoring, WebSocket connections, UI Polish\n" +
                "- **Open Questions:** Should we switch to WebRTC for voice calls?\n" +
                "- **Next Steps:** Complete the React frontend wiring today.\n\n" +
                "(Note: Mocked standup output).";
        return new AiResponse(summary);
    }

    public AiResponse triageBug(AiRequest request) {
        String triage = "### Bug Triage Analysis\n\n" +
                "Based on the provided stack trace/logs, the likely cause is a **NullPointerException** in the `WebSocketAuthInterceptor` where the session attributes are not properly checked before access.\n\n" +
                "**Suggested Fix:** Add a null check before retrieving `.get(\"username\")` or ensure the HTTP session is initialized.\n\n" +
                "(Note: Mocked bug triage response).";
        return new AiResponse(triage);
    }

    public AiResponse reviewCode(AiRequest request) {
        String lang = request.getLanguage() != null ? request.getLanguage() : "unknown";
        String review = "### Code Review Feedback (" + lang + ")\n\n" +
                "1. **Readability:** The code is reasonably well-structured, but adding JavaDoc/comments would be beneficial.\n" +
                "2. **Security:** Ensure that any user inputs passed to SQL queries are parameterized to prevent injection.\n" +
                "3. **Performance:** Consider memoizing expensive operations if this function is called frequently.\n\n" +
                "(Note: Mocked code review response).";
        return new AiResponse(review);
    }

    public AiResponse extractMeetingNotes(AiRequest request) {
        String notes = "### Meeting Decisions & Tasks\n\n" +
                "**Decisions Made:**\n" +
                "- We will release Phase 1 on Friday.\n" +
                "- PostgreSQL is chosen as the primary database.\n\n" +
                "**Action Items:**\n" +
                "- [ ] Write unit tests for ChatController (@Alice)\n" +
                "- [ ] Provision AWS RDS instance (@Bob)\n\n" +
                "(Note: Mocked meeting notes response).";
        return new AiResponse(notes);
    }

    public AiResponse smartSearch(AiRequest request) {
        String searchContext = request.getSearchQuery() != null ? request.getSearchQuery() : "general collaboration";
        String results = "### Smart Search Results for: \"" + searchContext + "\"\n\n" +
                "I found relevant discussions from last Thursday in the #architecture channel where Alice mentioned something related to this.\n\n" +
                "> *Alice at 10:45 AM:* 'We should look into " + searchContext + " to improve latency.'\n\n" +
                "(Note: Mocked smart search response).";
        return new AiResponse(results);
    }
}
