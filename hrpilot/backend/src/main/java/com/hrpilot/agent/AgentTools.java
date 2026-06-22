package com.hrpilot.agent;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.stereotype.Component;

/**
 * Tool methods that the AI Agent can autonomously call to answer HR questions.
 *
 * Beginners' note:
 * LangChain4j's @Tool annotation tells the AI model "you can call this function".
 * The AI decides WHEN to call each tool based on the user's question.
 * Think of these as the agent's "superpowers" — structured lookups it can do.
 *
 * Example flow:
 *   User: "Is John (5 years, full-time) eligible for FMLA?"
 *   Agent: calls checkFmlaEligibility("5 years", "full-time")
 *   Agent: returns the structured answer + calls lookupPolicy("FMLA") for detail
 */
@Component
public class AgentTools {

    @Tool("Look up relevant sections from company HR policy documents for a given topic")
    public String lookupPolicy(String topic) {
        try {
            // Use a placeholder company ID for tool calls — in production this would be injected
            // For now, return a structured response about where to find policy info
            return "Policy lookup for topic: " + topic +
                   ". Please refer to uploaded company HR documents. " +
                   "Use the RAG Q&A endpoint (/api/v1/chat/message) for detailed policy-grounded answers.";
        } catch (Exception e) {
            return "Could not retrieve policy information: " + e.getMessage();
        }
    }

    @Tool("Check FMLA (Family and Medical Leave Act) eligibility based on tenure and employment type")
    public String checkFmlaEligibility(String tenure, String employmentType) {
        boolean tenureEligible = parseTenureMonths(tenure) >= 12;
        boolean typeEligible = employmentType != null &&
                (employmentType.toLowerCase().contains("full") || employmentType.toLowerCase().contains("regular"));

        if (tenureEligible && typeEligible) {
            return String.format(
                    "FMLA Eligibility Check: ELIGIBLE. " +
                    "Tenure: %s (requirement: 12+ months), Employment type: %s. " +
                    "Employee may be entitled to up to 12 weeks of unpaid, job-protected leave per year. " +
                    "Consult HR for company-specific FMLA policy details.", tenure, employmentType);
        } else {
            return String.format(
                    "FMLA Eligibility Check: NOT ELIGIBLE. " +
                    "Tenure: %s (%s), Employment type: %s (%s). " +
                    "Please consult HR for alternative leave options.",
                    tenure, tenureEligible ? "meets requirement" : "below 12-month requirement",
                    employmentType, typeEligible ? "meets requirement" : "may not qualify");
        }
    }

    @Tool("Calculate PTO (Paid Time Off) balance based on accrual rate and days taken")
    public String calculatePtoBalance(double accrualRatePerMonth, int monthsWorked, double daysTaken) {
        double accrued = accrualRatePerMonth * monthsWorked;
        double balance = accrued - daysTaken;
        return String.format(
                "PTO Calculation: Accrued=%.1f days (%d months × %.1f/month), Used=%.1f days, Balance=%.1f days.",
                accrued, monthsWorked, accrualRatePerMonth, daysTaken, Math.max(0, balance));
    }

    @Tool("Check remote work eligibility based on job role and tenure")
    public String checkRemoteWorkEligibility(String jobRole, String tenure) {
        int months = parseTenureMonths(tenure);
        boolean eligible = months >= 3;
        return String.format(
                "Remote Work Eligibility for %s with %s tenure: %s. " +
                "%s. Consult HR policy for specific arrangements.",
                jobRole, tenure,
                eligible ? "ELIGIBLE" : "NOT YET ELIGIBLE",
                eligible ? "Employee meets the 3-month minimum tenure requirement."
                         : "Minimum 3 months of tenure required for remote work consideration.");
    }

    private int parseTenureMonths(String tenure) {
        if (tenure == null) return 0;
        String lower = tenure.toLowerCase().trim();
        try {
            if (lower.contains("year")) {
                double years = Double.parseDouble(lower.replaceAll("[^0-9.]", "").trim());
                return (int) (years * 12);
            } else if (lower.contains("month")) {
                return (int) Double.parseDouble(lower.replaceAll("[^0-9.]", "").trim());
            }
        } catch (NumberFormatException ignored) {}
        return 0;
    }
}
