/**
 * BDI Agent Runner
 *
 * TypeScript implementation of the BDI validation agents for quick testing.
 * This runner simulates the Jadex BDI agents by calling the DAO contracts directly.
 *
 * Usage:
 *   npx ts-node src/agent-runner.ts
 *
 * Or with specific actions:
 *   npx ts-node src/agent-runner.ts submit ./sample-data/employment-events.ttl
 *   npx ts-node src/agent-runner.ts validate <graphId>
 *   npx ts-node src/agent-runner.ts status <graphId>
 *   npx ts-node src/agent-runner.ts pipeline ./sample-data/employment-events.ttl
 */

import { ethers, Wallet, Contract, JsonRpcProvider } from "ethers";
import * as fs from "fs";
import * as crypto from "crypto";

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  rpcUrl: "http://localhost:8545",
  contracts: {
    MKMPOL21: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    GADataValidation: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  },
  agents: {
    coordinator: {
      name: "Coordinator Agent",
      privateKey: "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
      address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
    },
    syntaxValidator: {
      name: "Syntax Validator Agent",
      privateKey: "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
      address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
    },
    semanticValidator: {
      name: "Semantic Validator Agent",
      privateKey: "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
      address: "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
    },
    daoSubmitter: {
      name: "DAO Submitter Agent",
      privateKey: "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
      address: "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    },
  },
};

// =============================================================================
// Contract ABIs
// =============================================================================

const GA_ABI = [
  "function submitRDFGraph(string graphURI, bytes32 graphHash, uint8 graphType, uint8 datasetVariant, uint256 year, string modelVersion) external returns (bytes32)",
  "function markRDFGraphValidated(bytes32 graphId, bool isValid) external",
  "function approveRDFGraph(bytes32 graphId) external",
  "function markRDFGraphPublished(bytes32 graphId, string dkgAssetUAL) external",
  "function getGraphStatus(bytes32 graphId) external view returns (bool exists, bool validated, bool approved, bool published)",
  "function getRDFGraphBasicInfo(bytes32 graphId) external view returns (bytes32 graphHash, string graphURI, uint8 graphType, uint8 datasetVariant, uint256 year, uint256 version)",
  "function rdfGraphCount() external view returns (uint256)",
  "event RDFGraphSubmitted(bytes32 indexed graphId, string graphURI, uint8 indexed variant, uint256 indexed year, uint8 graphType)",
  "event RDFGraphValidated(bytes32 indexed graphId, bool syntaxValid, address indexed validator)",
  "event RDFGraphApproved(bytes32 indexed graphId, address indexed approver)",
];

const MKMPOL21_ABI = [
  "function hasRole(address user) external view returns (uint32)",
  "function has_permission(address user, uint64 permissionIndex) external view returns (bool)",
];

// =============================================================================
// Enums
// =============================================================================

enum GraphType {
  ARTICLES = 0,
  ENTITIES = 1,
  MENTIONS = 2,
  NLP = 3,
  ECONOMICS = 4,
  RELATIONS = 5,
  PROVENANCE = 6,
}

enum DatasetVariant {
  ERR_ONLINE = 0,
  OL_ONLINE = 1,
  OL_PRINT = 2,
  ARIREGISTER = 3,
}

// =============================================================================
// Utility Functions
// =============================================================================

function computeHash(content: string): string {
  return "0x" + crypto.createHash("sha256").update(content).digest("hex");
}

function log(agent: string, message: string): void {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
  console.log(`[${timestamp}] [${agent}] ${message}`);
}

// =============================================================================
// Agent Classes
// =============================================================================

class BaseAgent {
  protected provider: JsonRpcProvider;
  protected wallet: Wallet;
  protected gaContract: Contract;
  protected mkmpol21Contract: Contract;
  protected name: string;

  constructor(name: string, privateKey: string) {
    this.name = name;
    this.provider = new JsonRpcProvider(CONFIG.rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
    this.gaContract = new Contract(CONFIG.contracts.GADataValidation, GA_ABI, this.wallet);
    this.mkmpol21Contract = new Contract(CONFIG.contracts.MKMPOL21, MKMPOL21_ABI, this.provider);
  }

  async checkRole(): Promise<void> {
    const role = await this.mkmpol21Contract.hasRole(this.wallet.address);
    const roleIndex = Number(role) & 31;
    log(this.name, `Role: ${role} (index: ${roleIndex})`);
  }

  async checkPermission(permIndex: number): Promise<boolean> {
    return await this.mkmpol21Contract.has_permission(this.wallet.address, permIndex);
  }

  protected log(message: string): void {
    log(this.name, message);
  }
}

/**
 * DAO Submitter Agent
 * Submits RDF graphs to the DAO for validation
 */
class DAOSubmitterAgent extends BaseAgent {
  constructor() {
    super(CONFIG.agents.daoSubmitter.name, CONFIG.agents.daoSubmitter.privateKey);
  }

  async submitGraph(
    content: string,
    graphURI: string,
    graphType: GraphType = GraphType.ECONOMICS,
    datasetVariant: DatasetVariant = DatasetVariant.ERR_ONLINE,
    year: number = 2024,
    modelVersion: string = "EstBERT-1.0",
  ): Promise<string> {
    this.log(`Submitting RDF graph: ${graphURI}`);

    // Compute content hash
    const graphHash = computeHash(content);
    this.log(`Content hash: ${graphHash.slice(0, 18)}...`);

    // Submit to contract
    const tx = await this.gaContract.submitRDFGraph(graphURI, graphHash, graphType, datasetVariant, year, modelVersion);
    this.log(`Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    this.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Extract graphId from event
    let graphId = "";
    for (const log of receipt.logs) {
      try {
        const parsed = this.gaContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "RDFGraphSubmitted") {
          graphId = parsed.args[0];
          break;
        }
      } catch {
        // Skip non-matching logs
      }
    }

    if (!graphId) {
      throw new Error("Failed to extract graphId from transaction");
    }

    this.log(`Graph submitted successfully!`);
    this.log(`Graph ID: ${graphId}`);

    return graphId;
  }
}

/**
 * Syntax Validator Agent
 * Validates RDF syntax (simulates Apache Jena RIOT validation)
 */
class SyntaxValidatorAgent extends BaseAgent {
  constructor() {
    super(CONFIG.agents.syntaxValidator.name, CONFIG.agents.syntaxValidator.privateKey);
  }

  async validateGraph(graphId: string, content?: string): Promise<boolean> {
    this.log(`Validating RDF syntax for graph: ${graphId.slice(0, 18)}...`);

    // Simulate RIOT validation
    let isValid = true;
    if (content) {
      // Basic syntax checks (in real implementation, call RIOT)
      isValid = this.simulateRiotValidation(content);
    } else {
      // No content provided, assume valid for demo
      this.log("No content provided, assuming valid syntax");
    }

    this.log(`Syntax validation result: ${isValid ? "VALID" : "INVALID"}`);

    // Record validation on-chain
    const tx = await this.gaContract.markRDFGraphValidated(graphId, isValid);
    this.log(`Transaction sent: ${tx.hash}`);

    await tx.wait();
    this.log(`Validation recorded on-chain`);

    return isValid;
  }

  private simulateRiotValidation(content: string): boolean {
    // Basic TTL syntax checks
    // In production, this would call Apache Jena RIOT via subprocess

    // Check for common TTL patterns
    const hasPrefix = content.includes("@prefix") || content.includes("PREFIX");
    const hasTriples = content.includes(" .") || content.includes(";\n");

    if (!hasPrefix && !hasTriples) {
      this.log("Warning: Content may not be valid Turtle");
      return false;
    }

    // Check for balanced brackets
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      this.log("Warning: Unbalanced brackets detected");
      return false;
    }

    return true;
  }
}

/**
 * Semantic Validator Agent
 * Validates RDF semantics using SHACL and SPARQL
 */
class SemanticValidatorAgent extends BaseAgent {
  constructor() {
    super(CONFIG.agents.semanticValidator.name, CONFIG.agents.semanticValidator.privateKey);
  }

  async validateSemantics(graphId: string, content?: string): Promise<boolean> {
    this.log(`Validating RDF semantics for graph: ${graphId.slice(0, 18)}...`);

    // Simulate SHACL/SPARQL validation
    let isValid = true;
    if (content) {
      isValid = this.simulateShaclValidation(content);
    } else {
      this.log("No content provided, assuming valid semantics");
    }

    this.log(`Semantic validation result: ${isValid ? "VALID" : "INVALID"}`);

    // Note: In the current contract, validation is binary (validated=true/false)
    // Additional validation would overwrite the previous result
    // For multi-stage validation, the contract would need enhancement

    return isValid;
  }

  private simulateShaclValidation(content: string): boolean {
    // Simulate SHACL validation
    // In production, this would run actual SHACL shapes validation

    // Check for required employment event properties
    const hasEmploymentEvent = content.includes("employmentEvent") || content.includes("job_gain") || content.includes("job_loss");
    const hasEmtak = content.includes("EMTAK") || content.includes("hasEMTAKClassification");

    if (hasEmploymentEvent) {
      this.log("Employment event detected");
    }
    if (hasEmtak) {
      this.log("EMTAK classification detected");
    }

    return true; // For demo, always pass
  }
}

/**
 * Coordinator Agent
 * Orchestrates the validation pipeline
 */
class CoordinatorAgent extends BaseAgent {
  private syntaxValidator: SyntaxValidatorAgent;
  private semanticValidator: SemanticValidatorAgent;
  private daoSubmitter: DAOSubmitterAgent;

  constructor() {
    super(CONFIG.agents.coordinator.name, CONFIG.agents.coordinator.privateKey);
    this.syntaxValidator = new SyntaxValidatorAgent();
    this.semanticValidator = new SemanticValidatorAgent();
    this.daoSubmitter = new DAOSubmitterAgent();
  }

  async runPipeline(filePath: string): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("BDI VALIDATION PIPELINE");
    console.log("=".repeat(60) + "\n");

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
      this.log(`Loaded file: ${filePath} (${content.length} bytes)`);
    } catch (error) {
      // Create sample content for demo
      this.log(`File not found, using sample employment event data`);
      content = this.generateSampleContent();
    }

    // Generate graph URI from filename
    const filename = filePath.split("/").pop() || "employment-events.ttl";
    const graphURI = `urn:graph:${filename.replace(".ttl", "")}`;

    console.log("\n--- Stage 1: Submit to DAO ---");
    const graphId = await this.daoSubmitter.submitGraph(
      content,
      graphURI,
      GraphType.ECONOMICS,
      DatasetVariant.ERR_ONLINE,
      2024,
      "EstBERT-1.0",
    );

    console.log("\n--- Stage 2: Syntax Validation ---");
    const syntaxValid = await this.syntaxValidator.validateGraph(graphId, content);

    if (!syntaxValid) {
      this.log("Pipeline stopped: Syntax validation failed");
      return;
    }

    console.log("\n--- Stage 3: Semantic Validation ---");
    const semanticValid = await this.semanticValidator.validateSemantics(graphId, content);

    if (!semanticValid) {
      this.log("Pipeline stopped: Semantic validation failed");
      return;
    }

    console.log("\n--- Stage 4: Status Check ---");
    await this.checkGraphStatus(graphId);

    console.log("\n" + "=".repeat(60));
    console.log("PIPELINE COMPLETE");
    console.log("=".repeat(60));
    console.log(`\nGraph ID: ${graphId}`);
    console.log(`Graph URI: ${graphURI}`);
    console.log(`Status: Awaiting Committee Approval`);
    console.log(`\nNext Steps:`);
    console.log(`  1. Validation Committee reviews the graph`);
    console.log(`  2. Committee calls approveRDFGraph(graphId)`);
    console.log(`  3. Owner publishes to OriginTrail DKG`);
  }

  async checkGraphStatus(graphId: string): Promise<void> {
    const [exists, validated, approved, published] = await this.gaContract.getGraphStatus(graphId);

    this.log(`Graph Status:`);
    this.log(`  Exists: ${exists}`);
    this.log(`  Validated: ${validated}`);
    this.log(`  Approved: ${approved}`);
    this.log(`  Published: ${published}`);
  }

  private generateSampleContent(): string {
    return `@prefix ex: <http://mkm.ee/schema/> .
@prefix art: <http://mkm.ee/article/> .
@prefix ent: <http://mkm.ee/entity/> .
@prefix emp: <http://mkm.ee/employment/> .
@prefix cls: <http://mkm.ee/classification/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

art:20240305_014 a ex:Article ;
    dct:title "Pärnu mööblitootja WoodHive loob 120 uut töökohta" ;
    dct:created "2024-03-05T00:00:00+02:00"^^xsd:dateTime ;
    ex:source "ERR" ;
    ex:mentions ent:WoodHive, ent:Pärnu ;
    emp:employmentEvent "job_gain" ;
    emp:jobCount 120 ;
    cls:hasEMTAKClassification cls:31011 ;
    prov:wasGeneratedBy ex:PipelineRun_2024_03_05 .

ent:WoodHive a ex:Organization ;
    dct:title "WoodHive" .

ent:Pärnu a ex:Location ;
    dct:title "Pärnu" .

cls:31011 a ex:EMTAKClass ;
    dct:title "Kontorimööbli tootmine" .
`;
  }
}

// =============================================================================
// Main CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  console.log("\n" + "=".repeat(60));
  console.log("MKMPOL21 BDI Agent Runner");
  console.log("=".repeat(60) + "\n");

  switch (command) {
    case "pipeline": {
      const filePath = args[1] || "./sample-data/employment-events.ttl";
      const coordinator = new CoordinatorAgent();
      await coordinator.runPipeline(filePath);
      break;
    }

    case "submit": {
      const filePath = args[1];
      if (!filePath) {
        console.log("Usage: npx ts-node agent-runner.ts submit <filePath>");
        break;
      }
      const submitter = new DAOSubmitterAgent();
      const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "sample content";
      const graphId = await submitter.submitGraph(content, `urn:graph:${filePath}`);
      console.log(`\nSubmitted! Graph ID: ${graphId}`);
      break;
    }

    case "validate": {
      const graphId = args[1];
      if (!graphId) {
        console.log("Usage: npx ts-node agent-runner.ts validate <graphId>");
        break;
      }
      const validator = new SyntaxValidatorAgent();
      await validator.validateGraph(graphId);
      break;
    }

    case "status": {
      const graphId = args[1];
      if (!graphId) {
        console.log("Usage: npx ts-node agent-runner.ts status <graphId>");
        break;
      }
      const coordinator = new CoordinatorAgent();
      await coordinator.checkGraphStatus(graphId);
      break;
    }

    case "roles": {
      console.log("Checking agent roles...\n");
      const agents = [
        new CoordinatorAgent(),
        new SyntaxValidatorAgent(),
        new SemanticValidatorAgent(),
        new DAOSubmitterAgent(),
      ];
      for (const agent of agents) {
        await agent.checkRole();
      }
      break;
    }

    case "help":
    default:
      console.log("Commands:");
      console.log("  pipeline <filePath>  - Run full validation pipeline");
      console.log("  submit <filePath>    - Submit RDF file to DAO");
      console.log("  validate <graphId>   - Validate a submitted graph");
      console.log("  status <graphId>     - Check graph status");
      console.log("  roles                - Check agent roles");
      console.log("");
      console.log("Examples:");
      console.log("  npx ts-node src/agent-runner.ts pipeline ./employment.ttl");
      console.log("  npx ts-node src/agent-runner.ts status 0x1234...");
      break;
  }
}

main().catch(console.error);
