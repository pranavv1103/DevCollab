package com.hrpilot.agent;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for AgentTools — no Spring context needed.
 *
 * Beginners' note:
 * Unit tests test a single class in isolation.
 * We create the object directly (no Spring) and call its methods.
 * This is the fastest type of test.
 */
class AgentToolsTest {

    private final AgentTools tools = new AgentTools();

    @Test
    void checkFmlaEligibility_eligible() {
        String result = tools.checkFmlaEligibility("2 years", "full-time");
        assertThat(result).contains("ELIGIBLE");
        assertThat(result).contains("12 weeks");
    }

    @Test
    void checkFmlaEligibility_notEligible_shortTenure() {
        String result = tools.checkFmlaEligibility("6 months", "full-time");
        assertThat(result).contains("NOT ELIGIBLE");
    }

    @Test
    void calculatePtoBalance_correctMath() {
        String result = tools.calculatePtoBalance(1.5, 12, 5.0);
        // 1.5 * 12 = 18 days accrued, 5 used, 13 balance
        assertThat(result).contains("18.0");
        assertThat(result).contains("13.0");
    }

    @Test
    void checkRemoteWorkEligibility_eligible() {
        String result = tools.checkRemoteWorkEligibility("Software Engineer", "6 months");
        assertThat(result).contains("ELIGIBLE");
    }

    @Test
    void checkRemoteWorkEligibility_notEligible() {
        String result = tools.checkRemoteWorkEligibility("Analyst", "2 months");
        assertThat(result).contains("NOT YET ELIGIBLE");
    }

    @Test
    void lookupPolicy_returnsResponse() {
        String result = tools.lookupPolicy("vacation policy");
        assertThat(result).isNotEmpty();
        assertThat(result).containsIgnoringCase("vacation policy");
    }
}
