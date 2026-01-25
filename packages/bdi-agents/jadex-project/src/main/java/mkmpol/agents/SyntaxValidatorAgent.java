package mkmpol.agents;

import jadex.bdiv3.annotation.*;
import jadex.bdiv3.runtime.IPlan;
import jadex.micro.annotation.*;

/**
 * Syntax Validator BDI Agent
 *
 * Validates RDF syntax using Apache Jena/RIOT validation.
 * On receiving a validation request, executes the validation plan
 * and records the result on-chain.
 */
@Agent
@Description("Validates RDF syntax for submitted graphs")
public class SyntaxValidatorAgent {

    // Agent configuration
    private static final String AGENT_ADDRESS = "0x71bE63f3384f5fb98995898A86B02Fb2426c5788";
    private static final String PRIVATE_KEY = "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82";
    private static final String API_BASE_URL = "http://localhost:3000/api/bdi-agent";

    // DAO Client
    private DAOClient daoClient;

    // ==========================================================================
    // Beliefs
    // ==========================================================================

    @Belief
    protected String currentGraphId;

    @Belief
    protected boolean rdfSyntaxValid;

    @Belief
    protected String validationErrors;

    @Belief
    protected boolean validationInProgress;

    // ==========================================================================
    // Goals
    // ==========================================================================

    /**
     * Goal: Validate RDF syntax for a graph
     */
    @Goal
    public class ValidateRDFSyntax {
        @GoalParameter
        protected String graphId;

        @GoalParameter
        protected String rdfContent;

        public ValidateRDFSyntax(String graphId, String rdfContent) {
            this.graphId = graphId;
            this.rdfContent = rdfContent;
        }

        public String getGraphId() { return graphId; }
        public String getRdfContent() { return rdfContent; }
    }

    // ==========================================================================
    // Plans
    // ==========================================================================

    /**
     * Plan: Execute RDF syntax validation
     */
    @Plan(trigger = @Trigger(goals = ValidateRDFSyntax.class))
    public void validateSyntaxPlan(ValidateRDFSyntax goal) {
        String graphId = goal.getGraphId();
        String content = goal.getRdfContent();

        log("Starting syntax validation for graph: " + graphId.substring(0, 18) + "...");

        currentGraphId = graphId;
        validationInProgress = true;

        try {
            // Step 1: Run RIOT validation (simulated)
            boolean isValid = runRiotValidation(content);
            rdfSyntaxValid = isValid;

            log("Syntax validation result: " + (isValid ? "VALID" : "INVALID"));

            // Step 2: Record result on-chain via API
            DAOClient.ValidationResult result = daoClient.validateGraph(PRIVATE_KEY, graphId, isValid);

            log("Validation recorded on-chain, tx: " + result.txHash);

        } catch (Exception e) {
            log("ERROR: Validation failed - " + e.getMessage());
            validationErrors = e.getMessage();
            rdfSyntaxValid = false;
        } finally {
            validationInProgress = false;
        }
    }

    // ==========================================================================
    // Agent Lifecycle
    // ==========================================================================

    @AgentCreated
    public void init() {
        log("Agent initialized");
        daoClient = new DAOClient(API_BASE_URL);

        // Verify role
        try {
            DAOClient.RoleInfo role = daoClient.getAgentRole(AGENT_ADDRESS);
            log("Role verified: " + role.roleName + " (index: " + role.roleIndex + ")");

            boolean hasPermission = daoClient.checkPermission(AGENT_ADDRESS, 4);
            log("Permission 4 (validate): " + hasPermission);
        } catch (Exception e) {
            log("WARNING: Could not verify role - " + e.getMessage());
        }
    }

    // ==========================================================================
    // Helper Methods
    // ==========================================================================

    /**
     * Simulate Apache Jena RIOT validation
     * In production, this would call RIOT via subprocess or library
     */
    private boolean runRiotValidation(String content) {
        if (content == null || content.isEmpty()) {
            validationErrors = "Empty content";
            return false;
        }

        // Basic TTL syntax checks
        boolean hasPrefix = content.contains("@prefix") || content.contains("PREFIX");
        boolean hasTriples = content.contains(" .") || content.contains(";\n");

        if (!hasPrefix && !hasTriples) {
            validationErrors = "Content may not be valid Turtle";
            return false;
        }

        // Check balanced brackets
        long openBrackets = content.chars().filter(ch -> ch == '[').count();
        long closeBrackets = content.chars().filter(ch -> ch == ']').count();
        if (openBrackets != closeBrackets) {
            validationErrors = "Unbalanced brackets";
            return false;
        }

        validationErrors = null;
        return true;
    }

    private void log(String message) {
        System.out.println("[SyntaxValidator] " + message);
    }

    // ==========================================================================
    // Public API for external calls
    // ==========================================================================

    /**
     * Request validation of a graph
     * Called by Coordinator Agent or external systems
     */
    public void requestValidation(String graphId, String rdfContent) {
        // Create and dispatch goal
        ValidateRDFSyntax goal = new ValidateRDFSyntax(graphId, rdfContent);
        // In Jadex, the goal would be dispatched via the BDI runtime
        // For simplicity, we execute directly
        validateSyntaxPlan(goal);
    }
}
