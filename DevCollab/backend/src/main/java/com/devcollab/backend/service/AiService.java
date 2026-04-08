package com.devcollab.backend.service;

import com.devcollab.backend.dto.request.AiRequest;
import com.devcollab.backend.dto.response.AiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiService {

    private static final Logger logger = LoggerFactory.getLogger(AiService.class);

    @Value("${ai.groq.api-key:#{null}}")
    private String groqApiKey;

    @Autowired
    private ObjectMapper objectMapper;

    // -----------------------------------------------------------------------
    // LLM gateway — tries Groq (free tier, llama3) when key is configured.
    // Falls back to smart local templates if key is absent or call fails.
    // -----------------------------------------------------------------------
    private String callLlm(String systemPrompt, String userPrompt) {
        if (groqApiKey == null || groqApiKey.isBlank()) return null;
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("model", "llama3-8b-8192");
            root.put("max_tokens", 700);
            root.put("temperature", 0.6);

            ArrayNode messages = root.putArray("messages");
            ObjectNode sys = messages.addObject();
            sys.put("role", "system");
            sys.put("content", systemPrompt);
            ObjectNode user = messages.addObject();
            user.put("role", "user");
            user.put("content", userPrompt);

            String body = objectMapper.writeValueAsString(root);

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                    .header("Authorization", "Bearer " + groqApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(20))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode resp = objectMapper.readTree(response.body());
                return resp.path("choices").get(0).path("message").path("content").asText();
            }
            logger.warn("Groq API returned HTTP {}", response.statusCode());
        } catch (Exception e) {
            logger.warn("Groq API call failed, using local fallback: {}", e.getMessage());
        }
        return null;
    }

    // -----------------------------------------------------------------------
    // Public endpoints
    // -----------------------------------------------------------------------

    public AiResponse explainCode(AiRequest request) {
        String lang = nvl(request.getLanguage(), "code");
        String code = nvl(request.getCodeSnippet(), "");

        String llm = callLlm(
            "You are a concise, helpful code explainer. Respond in plain text with 2-3 paragraphs.",
            "Explain this " + lang + " code:\n```" + lang + "\n" + code + "\n```"
        );
        if (llm != null) return new AiResponse(llm);

        // Smart local fallback: derive stats from actual code
        int lines = code.isEmpty() ? 0 : code.split("\n").length;
        List<String> keywords = detectKeywords(code, lang);
        String kw = keywords.isEmpty() ? "general logic" : String.join(", ", keywords);

        return new AiResponse(
            "**Code Explanation (" + lang + ")**\n\n" +
            "This " + lang + " snippet is " + lines + " line" + (lines == 1 ? "" : "s") + " long. " +
            "It appears to use: **" + kw + "**.\n\n" +
            "The code defines structured logic — likely a function or method that processes input and produces a result. " +
            "Reading from top to bottom, each statement builds on the previous context.\n\n" +
            "_Tip: Add an OpenAI or Groq API key (env var `GROQ_API_KEY`) for real LLM-powered explanations._"
        );
    }

    public AiResponse summarizeChat(AiRequest request) {
        List<String> msgs = nvlList(request.getChatMessages());
        int count = msgs.size();

        String llm = callLlm(
            "You are a concise chat summarizer. Summarize in 3-5 bullet points, no filler.",
            "Summarize this chat (most recent messages last):\n" + String.join("\n", msgs.stream().limit(30).collect(Collectors.toList()))
        );
        if (llm != null) return new AiResponse(llm);

        // Smart local: extract real contributors and topics
        Set<String> contributors = extractContributors(msgs);
        List<String> topics = extractTopics(msgs);

        String who = contributors.isEmpty() ? "the team" : String.join(", ", contributors);
        String what = topics.isEmpty() ? "project tasks" : String.join(", ", topics);

        return new AiResponse(
            "**Chat Summary** (" + count + " messages)\n\n" +
            "- **Participants:** " + who + "\n" +
            "- **Topics discussed:** " + what + "\n" +
            "- **Message volume:** " + count + " messages in this session\n" +
            (count > 0 ? "- **Latest context:** " + truncate(msgs.get(count - 1), 80) + "\n" : "") +
            "\n_For AI-generated summaries add a `GROQ_API_KEY` environment variable._"
        );
    }

    public AiResponse suggestImprovements(AiRequest request) {
        String lang = nvl(request.getLanguage(), "the");
        String code = nvl(request.getCodeSnippet(), "");

        String llm = callLlm(
            "You are a senior developer giving concise code improvement suggestions. Be direct and specific.",
            "Suggest improvements for this " + lang + " code:\n```" + lang + "\n" + code + "\n```"
        );
        if (llm != null) return new AiResponse(llm);

        List<String> suggestions = buildSuggestions(code, lang);
        return new AiResponse(
            "**Code Improvement Suggestions (" + lang + ")**\n\n" +
            suggestions.stream().map(s -> "- " + s).collect(Collectors.joining("\n"))
        );
    }

    public AiResponse generateStandup(AiRequest request) {
        List<String> msgs = nvlList(request.getChatMessages());

        String llm = callLlm(
            "Generate a concise daily standup summary in this format: What was done, what's in progress, any blockers. Use bullet points.",
            "Generate a standup from these channel messages:\n" + String.join("\n", msgs.stream().limit(30).collect(Collectors.toList()))
        );
        if (llm != null) return new AiResponse(llm);

        Set<String> contributors = extractContributors(msgs);
        List<String> doneItems = extractActionItems(msgs, List.of("fixed", "completed", "merged", "deployed", "closed", "shipped", "done", "finished"));
        List<String> inProgressItems = extractActionItems(msgs, List.of("working on", "implementing", "building", "reviewing", "testing", "investigating"));
        List<String> blockers = extractActionItems(msgs, List.of("blocked", "stuck", "waiting for", "issue with", "broken", "failing", "problem"));

        StringBuilder sb = new StringBuilder("**Daily Standup Summary**\n\n");
        sb.append("**Team:** ").append(contributors.isEmpty() ? "Team" : String.join(", ", contributors)).append("\n\n");
        sb.append("**✅ Completed:**\n");
        if (doneItems.isEmpty()) sb.append("- Review recent messages for specifics\n");
        else doneItems.stream().limit(4).forEach(i -> sb.append("- ").append(i).append("\n"));
        sb.append("\n**🔄 In Progress:**\n");
        if (inProgressItems.isEmpty()) sb.append("- Ongoing development tasks\n");
        else inProgressItems.stream().limit(4).forEach(i -> sb.append("- ").append(i).append("\n"));
        sb.append("\n**🚧 Blockers:**\n");
        if (blockers.isEmpty()) sb.append("- None reported\n");
        else blockers.stream().limit(3).forEach(i -> sb.append("- ").append(i).append("\n"));

        return new AiResponse(sb.toString());
    }

    public AiResponse triageBug(AiRequest request) {
        List<String> msgs = nvlList(request.getChatMessages());
        String code = nvl(request.getCodeSnippet(), "");
        String combined = code + "\n" + String.join("\n", msgs);

        String llm = callLlm(
            "You are an expert bug triager. Identify the most likely cause and suggest a concrete fix. Be concise.",
            "Triage this bug report / stack trace:\n" + combined
        );
        if (llm != null) return new AiResponse(llm);

        // Smart: look for real exception patterns
        List<String> exceptions = detectExceptions(combined);
        String severity = detectSeverity(combined);

        StringBuilder sb = new StringBuilder("**Bug Triage Report**\n\n");
        sb.append("**Severity:** ").append(severity).append("\n\n");
        if (!exceptions.isEmpty()) {
            sb.append("**Detected Errors:**\n");
            exceptions.stream().limit(5).forEach(e -> sb.append("- `").append(e).append("`\n"));
            sb.append("\n");
        }
        sb.append("**Likely Causes:**\n");
        sb.append(buildBugAnalysis(combined));
        sb.append("\n\n**Suggested Fixes:**\n");
        sb.append(buildBugFixes(exceptions, combined));

        return new AiResponse(sb.toString());
    }

    public AiResponse reviewCode(AiRequest request) {
        String lang = nvl(request.getLanguage(), "unknown");
        String code = nvl(request.getCodeSnippet(), "");

        String llm = callLlm(
            "You are a senior engineer doing a code review. Give 3-5 specific, actionable feedback points. Be direct.",
            "Review this " + lang + " code:\n```" + lang + "\n" + code + "\n```"
        );
        if (llm != null) return new AiResponse(llm);

        List<String> points = buildCodeReview(code, lang);
        return new AiResponse(
            "**Code Review (" + lang + ")**\n\n" +
            points.stream().map(p -> "- " + p).collect(Collectors.joining("\n"))
        );
    }

    public AiResponse extractMeetingNotes(AiRequest request) {
        List<String> msgs = nvlList(request.getChatMessages());

        String llm = callLlm(
            "Extract meeting decisions and action items from this conversation. Format as: Decisions Made, Action Items (with @assignee if mentioned), Open Questions.",
            "Extract meeting notes from:\n" + String.join("\n", msgs.stream().limit(50).collect(Collectors.toList()))
        );
        if (llm != null) return new AiResponse(llm);

        List<String> decisions = extractPatternMatches(msgs, List.of("decided", "agreed", "confirmed", "approved", "will use", "going with"));
        List<String> actions = extractActionItems(msgs, List.of("todo", "action:", "assign", "should", "needs to", "will create", "will fix", "will write"));
        List<String> questions = extractPatternMatches(msgs, List.of("?", "should we", "what about", "how do we", "wondering if"));
        Set<String> contributors = extractContributors(msgs);

        StringBuilder sb = new StringBuilder("**Meeting Notes**\n\n");
        sb.append("**Attendees:** ").append(contributors.isEmpty() ? "Team" : String.join(", ", contributors)).append("\n\n");
        sb.append("**Decisions Made:**\n");
        if (decisions.isEmpty()) sb.append("- See chat messages for context\n");
        else decisions.stream().limit(5).forEach(d -> sb.append("- ").append(d).append("\n"));
        sb.append("\n**Action Items:**\n");
        if (actions.isEmpty()) sb.append("- [ ] Follow up on outstanding tasks\n");
        else actions.stream().limit(6).forEach(a -> sb.append("- [ ] ").append(a).append("\n"));
        sb.append("\n**Open Questions:**\n");
        if (questions.isEmpty()) sb.append("- None recorded\n");
        else questions.stream().limit(4).forEach(q -> sb.append("- ").append(q).append("\n"));

        return new AiResponse(sb.toString());
    }

    public AiResponse smartSearch(AiRequest request) {
        String query = nvl(request.getSearchQuery(), "");
        List<String> msgs = nvlList(request.getChatMessages());

        String llm = callLlm(
            "You are a smart search assistant. Find the most relevant messages for the query and summarize what was said.",
            "Query: \"" + query + "\"\n\nMessages:\n" + String.join("\n", msgs.stream().limit(50).collect(Collectors.toList()))
        );
        if (llm != null) return new AiResponse(llm);

        // Smart local: actually filter messages by query terms
        String[] terms = query.toLowerCase().split("\\s+");
        List<String> matches = msgs.stream()
            .filter(m -> Arrays.stream(terms).anyMatch(t -> m.toLowerCase().contains(t)))
            .limit(5)
            .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder("**Smart Search: \"" + query + "\"**\n\n");
        if (matches.isEmpty()) {
            sb.append("No messages found matching your query in the recent history.");
        } else {
            sb.append("Found **").append(matches.size()).append("** relevant message(s):\n\n");
            matches.forEach(m -> sb.append("> ").append(truncate(m, 120)).append("\n\n"));
        }

        return new AiResponse(sb.toString());
    }

    // -----------------------------------------------------------------------
    // Smart template helpers — process real input data
    // -----------------------------------------------------------------------

    private Set<String> extractContributors(List<String> msgs) {
        Set<String> result = new LinkedHashSet<>();
        for (String m : msgs) {
            if (m.contains(": ")) {
                String name = m.split(": ")[0].trim();
                if (name.length() > 0 && name.length() < 40 && !name.contains("\n")) result.add(name);
            }
        }
        return result;
    }

    private List<String> extractTopics(List<String> msgs) {
        Map<String, Integer> freq = new LinkedHashMap<>();
        String[] stopWords = {"the","a","an","is","it","to","in","on","at","be","we","i","you","he","she","they","this","that","and","or","of","for","with","as","by","from"};
        Set<String> stops = new HashSet<>(Arrays.asList(stopWords));
        for (String m : msgs) {
            String content = m.contains(": ") ? m.substring(m.indexOf(": ") + 2) : m;
            for (String word : content.toLowerCase().replaceAll("[^a-zA-Z0-9 ]", " ").split("\\s+")) {
                if (word.length() > 4 && !stops.contains(word)) {
                    freq.merge(word, 1, (a, b) -> a + b);
                }
            }
        }
        return freq.entrySet().stream()
            .filter(e -> e.getValue() > 1)
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(5)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    private List<String> extractActionItems(List<String> msgs, List<String> triggers) {
        List<String> result = new ArrayList<>();
        for (String m : msgs) {
            String lower = m.toLowerCase();
            for (String t : triggers) {
                if (lower.contains(t)) {
                    String content = m.contains(": ") ? m.substring(m.indexOf(": ") + 2) : m;
                    result.add(truncate(content, 100));
                    break;
                }
            }
        }
        return result;
    }

    private List<String> extractPatternMatches(List<String> msgs, List<String> patterns) {
        List<String> result = new ArrayList<>();
        for (String m : msgs) {
            String lower = m.toLowerCase();
            for (String p : patterns) {
                if (lower.contains(p.toLowerCase())) {
                    String content = m.contains(": ") ? m.substring(m.indexOf(": ") + 2) : m;
                    result.add(truncate(content, 100));
                    break;
                }
            }
        }
        return result;
    }

    private List<String> detectKeywords(String code, String lang) {
        List<String> found = new ArrayList<>();
        Map<String, String[]> patterns = Map.of(
            "java",   new String[]{"class","interface","stream","lambda","Optional","@Override","try","catch","async"},
            "python", new String[]{"def","class","lambda","async","await","with","yield","@"},
            "javascript", new String[]{"function","arrow","async","await","Promise","class","const","let"},
            "typescript", new String[]{"interface","type","enum","async","await","generic","decorator"}
        );
        String[] checks = patterns.getOrDefault(lang.toLowerCase(), new String[]{"function","loop","condition","class"});
        for (String kw : checks) {
            if (code.toLowerCase().contains(kw.toLowerCase())) found.add(kw);
        }
        return found.stream().limit(5).collect(Collectors.toList());
    }

    private List<String> buildSuggestions(String code, String lang) {
        List<String> s = new ArrayList<>();
        if (code.length() > 200) s.add("Consider extracting long blocks into well-named helper methods.");
        if (!code.contains("//") && !code.contains("/*") && !code.contains("#")) s.add("Add inline comments for non-obvious logic.");
        if (code.contains("null") || code.contains("None") || code.contains("undefined")) s.add("Add null/undefined checks or use Optional/nullable types.");
        if (lang.equalsIgnoreCase("java")) {
            if (!code.contains("Optional")) s.add("Use `Optional<T>` instead of nullable return types.");
            if (code.contains("for(") || code.contains("for (")) s.add("Consider replacing imperative loops with Java Streams for clarity.");
        }
        if (lang.equalsIgnoreCase("javascript") || lang.equalsIgnoreCase("typescript")) {
            if (code.contains("var ")) s.add("Replace `var` with `const`/`let` for proper scoping.");
            if (!code.contains("try") && code.contains("await")) s.add("Wrap `await` calls in try-catch for error handling.");
        }
        if (s.size() < 3) s.add("Apply consistent naming conventions (" + (lang.equalsIgnoreCase("python") ? "snake_case" : "camelCase") + ").");
        if (s.size() < 4) s.add("Add unit tests to cover edge cases for this function.");
        return s;
    }

    private List<String> buildCodeReview(String code, String lang) {
        List<String> r = new ArrayList<>();
        int lines = code.isEmpty() ? 0 : code.split("\n").length;
        r.add("**Length:** " + lines + " lines — " + (lines > 50 ? "consider splitting into smaller functions." : "reasonable size."));
        if (code.contains("TODO") || code.contains("FIXME") || code.contains("HACK")) r.add("**TODOs present:** Resolve or track `TODO`/`FIXME` comments before merging.");
        if (!code.contains("test") && !code.contains("spec") && !code.contains("assert")) r.add("**Testing:** No test coverage visible — add unit tests.");
        r.add("**Security:** Ensure any user inputs are validated/sanitized before use.");
        r.add("**Error handling:** Verify all exception/error paths are handled gracefully.");
        return r;
    }

    private List<String> detectExceptions(String text) {
        List<String> found = new ArrayList<>();
        for (String line : text.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.matches(".*(Exception|Error|Caused by|Traceback|at \\w+\\.\\w+).*")) {
                found.add(truncate(trimmed, 80));
            }
        }
        return found;
    }

    private String detectSeverity(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("null") && lower.contains("exception")) return "🔴 High — NullPointerException detected";
        if (lower.contains("stackoverflowerror")) return "🔴 High — Stack overflow (infinite recursion likely)";
        if (lower.contains("outofmemory")) return "🔴 High — Memory exhaustion";
        if (lower.contains("exception") || lower.contains("error")) return "🟡 Medium — Exception or error detected";
        return "🟢 Low — No critical patterns found";
    }

    private String buildBugAnalysis(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("nullpointer") || lower.contains("cannot invoke") || lower.contains("none has no attribute")) {
            return "- Likely a **null/undefined reference** — object was not initialized before use.\n";
        }
        if (lower.contains("classcastexception") || lower.contains("typeerror")) {
            return "- **Type mismatch** — an object is being cast or used as the wrong type.\n";
        }
        if (lower.contains("indexoutofbounds") || lower.contains("invalid index")) {
            return "- **Array/list index out of bounds** — accessing an index that doesn't exist.\n";
        }
        if (lower.contains("connection refused") || lower.contains("timeout") || lower.contains("econnreset")) {
            return "- **Network/connection issue** — a downstream service or DB is unreachable.\n";
        }
        if (lower.contains("401") || lower.contains("403") || lower.contains("unauthorized")) {
            return "- **Auth failure** — missing or invalid credentials/token.\n";
        }
        return "- Review the stack trace above for the immediate cause.\n- Check for unhandled edge cases in the surrounding logic.\n";
    }

    private String buildBugFixes(List<String> exceptions, String text) {
        String lower = text.toLowerCase();
        if (lower.contains("nullpointer") || lower.contains("null")) return "- Add an explicit null check: `if (obj == null) return;`\n- Use `Optional.ofNullable(obj)` in Java or `?.` optional chaining in JS.\n";
        if (lower.contains("classcast")) return "- Use `instanceof` before casting.\n- Review the object creation to ensure correct type.\n";
        if (lower.contains("connection") || lower.contains("timeout")) return "- Check environment variables / config for correct host/port.\n- Add retry logic with exponential backoff.\n";
        if (!exceptions.isEmpty()) return "- Address the topmost exception in the stack trace first.\n- Add logging around the failure point.\n";
        return "- Add debug logging before the failing line.\n- Write a minimal reproducible test case.\n";
    }

    // -----------------------------------------------------------------------
    // Utility helpers
    // -----------------------------------------------------------------------

    private String nvl(String s, String fallback) { return (s == null || s.isBlank()) ? fallback : s; }

    private List<String> nvlList(List<String> list) { return list != null ? list : Collections.emptyList(); }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
