package com.hrpilot.agent;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

/**
 * LangChain4j AI Service interface for the HR Compliance Agent.
 *
 * The agent combines RAG + tool-calling:
 * - It can call tools defined in AgentTools (FMLA check, PTO calc, etc.)
 * - It has a system prompt that defines its role and behavior
 * - It maintains conversation context across multiple turns
 *
 * Beginners' note:
 * This is an interface, not a class — LangChain4j generates a proxy implementation
 * at runtime using AiServices.builder(). Think of it like Spring's @Repository:
 * you define the contract, the framework provides the implementation.
 */
public interface HrComplianceAgent {

    @SystemMessage("""
            You are HRPilot, an expert AI assistant specializing in HR compliance and employment law.
            You help HR professionals and employees understand company policies, calculate entitlements,
            and ensure legal compliance.
            
            Your capabilities:
            - Look up specific HR policy sections from company documents
            - Check FMLA eligibility based on employee details  
            - Calculate PTO balances
            - Check remote work eligibility
            
            Always:
            - Be precise and cite relevant laws or policies
            - Ask clarifying questions if employee details are missing
            - Recommend consulting an HR professional for complex cases
            - Stay within company policy boundaries
            """)
    @UserMessage("Employee question: {{question}}\nEmployee context: {{context}}")
    String chat(@V("question") String question, @V("context") String context);
}
