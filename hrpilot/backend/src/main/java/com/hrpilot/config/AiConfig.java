package com.hrpilot.config;

import com.hrpilot.agent.AgentTools;
import com.hrpilot.agent.HrComplianceAgent;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.service.AiServices;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Manually configures LangChain4j AI beans.
 *
 * We do this manually (instead of relying on auto-configuration) for full control
 * and to ensure compatibility with Spring Boot 3.5.
 *
 * Beginners' note:
 * - ChatLanguageModel is the AI that answers questions (GPT-4o-mini).
 * - EmbeddingModel converts text into a float[] vector (1536 numbers).
 *   Similar texts have similar vectors — this is how semantic search works.
 * - HrComplianceAgent is a tool-calling agent with access to AgentTools.
 */
@Configuration
public class AiConfig {

    @Value("${langchain4j.open-ai.api-key:sk-placeholder}")
    private String openAiApiKey;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        return OpenAiChatModel.builder()
                .apiKey(openAiApiKey)
                .modelName("gpt-4o-mini")
                .timeout(Duration.ofSeconds(60))
                .maxRetries(2)
                .build();
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        return OpenAiEmbeddingModel.builder()
                .apiKey(openAiApiKey)
                .modelName("text-embedding-3-small")
                .timeout(Duration.ofSeconds(30))
                .build();
    }

    @Bean
    public HrComplianceAgent hrComplianceAgent(ChatLanguageModel chatModel, AgentTools tools) {
        return AiServices.builder(HrComplianceAgent.class)
                .chatLanguageModel(chatModel)
                .tools(tools)
                .chatMemory(MessageWindowChatMemory.withMaxMessages(20))
                .build();
    }
}
