package mkmpol.agents;

/**
 * Agent Launcher
 *
 * Entry point for running BDI validation agents.
 * Supports both standalone execution and pipeline mode.
 *
 * Usage:
 *   java -jar mkmpol21-bdi-agents.jar [command] [args...]
 *
 * Commands:
 *   pipeline <rdfContent>  - Run full validation pipeline
 *   validate <graphId>     - Validate a specific graph
 *   status <graphId>       - Check graph status
 */
public class AgentLauncher {

    private static final String API_BASE_URL = "http://localhost:3000/api/bdi-agent";

    public static void main(String[] args) {
        System.out.println("=".repeat(60));
        System.out.println("MKMPOL21 BDI Agent Launcher (Jadex)");
        System.out.println("=".repeat(60));

        if (args.length == 0) {
            printUsage();
            return;
        }

        String command = args[0];
        DAOClient client = new DAOClient(API_BASE_URL);

        try {
            switch (command) {
                case "validate":
                    if (args.length < 2) {
                        System.out.println("Usage: validate <graphId>");
                        return;
                    }
                    runValidation(client, args[1]);
                    break;

                case "status":
                    if (args.length < 2) {
                        System.out.println("Usage: status <graphId>");
                        return;
                    }
                    checkStatus(client, args[1]);
                    break;

                case "pipeline":
                    runPipeline(client, args.length > 1 ? args[1] : null);
                    break;

                case "roles":
                    checkRoles(client);
                    break;

                default:
                    System.out.println("Unknown command: " + command);
                    printUsage();
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void runValidation(DAOClient client, String graphId) throws Exception {
        System.out.println("\nValidating graph: " + graphId);

        // Create and run syntax validator
        SyntaxValidatorAgent validator = new SyntaxValidatorAgent();
        validator.init();
        validator.requestValidation(graphId, ""); // Content would come from storage

        // Check status after validation
        checkStatus(client, graphId);
    }

    private static void checkStatus(DAOClient client, String graphId) throws Exception {
        System.out.println("\nChecking status for graph: " + graphId);

        DAOClient.GraphStatus status = client.getGraphStatus(graphId);

        System.out.println("Graph Status:");
        System.out.println("  Exists: " + status.exists);
        System.out.println("  Validated: " + status.validated);
        System.out.println("  Approved: " + status.approved);
        System.out.println("  Published: " + status.published);
    }

    private static void runPipeline(DAOClient client, String rdfContent) throws Exception {
        System.out.println("\n--- Running Validation Pipeline ---\n");

        if (rdfContent == null || rdfContent.isEmpty()) {
            rdfContent = generateSampleContent();
            System.out.println("Using sample employment event data...");
        }

        // Step 1: Submit graph
        System.out.println("\nStep 1: Submitting graph to DAO...");
        String submitterKey = "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd";
        String graphHash = "0x" + toHex(rdfContent.getBytes());

        DAOClient.SubmissionResult submission = client.submitGraph(
            submitterKey,
            "urn:graph:employment-events-jadex",
            graphHash.length() > 66 ? graphHash.substring(0, 66) : graphHash,
            4, // ECONOMICS
            0, // ERR_ONLINE
            2024,
            "EstBERT-1.0"
        );

        System.out.println("  Graph ID: " + submission.graphId);
        System.out.println("  Tx Hash: " + submission.txHash);

        // Step 2: Validate syntax
        System.out.println("\nStep 2: Running syntax validation...");
        String validatorKey = "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82";

        DAOClient.ValidationResult validation = client.validateGraph(
            validatorKey,
            submission.graphId,
            true
        );

        System.out.println("  Valid: " + validation.isValid);
        System.out.println("  Tx Hash: " + validation.txHash);

        // Step 3: Check final status
        System.out.println("\nStep 3: Checking final status...");
        checkStatus(client, submission.graphId);

        System.out.println("\n--- Pipeline Complete ---");
        System.out.println("Graph awaits committee approval.");
    }

    private static void checkRoles(DAOClient client) throws Exception {
        System.out.println("\nChecking agent roles...\n");

        String[] addresses = {
            "0xBcd4042DE499D14e55001CcbB24a551F3b954096", // Coordinator
            "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", // Syntax Validator
            "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a", // Semantic Validator
            "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec"  // DAO Submitter
        };

        String[] names = {
            "Coordinator",
            "Syntax Validator",
            "Semantic Validator",
            "DAO Submitter"
        };

        for (int i = 0; i < addresses.length; i++) {
            DAOClient.RoleInfo role = client.getAgentRole(addresses[i]);
            System.out.printf("%s: %s (index: %d)%n", names[i], role.roleName, role.roleIndex);
        }
    }

    private static void printUsage() {
        System.out.println("\nUsage:");
        System.out.println("  java -jar mkmpol21-bdi-agents.jar <command> [args...]");
        System.out.println();
        System.out.println("Commands:");
        System.out.println("  pipeline         - Run full validation pipeline with sample data");
        System.out.println("  validate <id>    - Validate a submitted graph");
        System.out.println("  status <id>      - Check graph status");
        System.out.println("  roles            - Check agent roles");
    }

    private static String generateSampleContent() {
        return """
            @prefix ex: <http://mkm.ee/schema/> .
            @prefix art: <http://mkm.ee/article/> .
            @prefix emp: <http://mkm.ee/employment/> .
            @prefix cls: <http://mkm.ee/classification/> .
            @prefix dct: <http://purl.org/dc/terms/> .

            art:20240305_014 a ex:Article ;
                dct:title "Pärnu mööblitootja WoodHive loob 120 uut töökohta" ;
                emp:employmentEvent "job_gain" ;
                emp:jobCount 120 ;
                cls:hasEMTAKClassification cls:31011 .
            """;
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        // Pad to 64 chars for bytes32
        while (sb.length() < 64) {
            sb.append("0");
        }
        return sb.substring(0, 64);
    }
}
