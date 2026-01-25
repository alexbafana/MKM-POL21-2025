# MKMPOL21 BDI Validation Agents

This package contains BDI (Belief-Desire-Intention) validation agents for the MKMPOL21 DAO. The agents validate RDF files from the employment event detection pipeline (CSV → NLP → NER → LLM → EMTAK → RDF).

## Quick Start (TypeScript Runner)

The fastest way to run the agents is using the TypeScript runner.

### Prerequisites

1. Hardhat node running (`yarn chain` from root)
2. Contracts deployed (`yarn deploy`)
3. Agent roles assigned (`npx hardhat run scripts/setup-agent-roles.ts --network localhost`)

### Installation

```bash
cd packages/bdi-agents
npm install
```

### Run the Validation Pipeline

```bash
# Run full pipeline with sample data
npx ts-node src/agent-runner.ts pipeline

# Or with a specific file
npx ts-node src/agent-runner.ts pipeline ./my-data/employment-events.ttl
```

### Other Commands

```bash
# Check agent roles
npx ts-node src/agent-runner.ts roles

# Submit a graph
npx ts-node src/agent-runner.ts submit ./my-file.ttl

# Validate a submitted graph
npx ts-node src/agent-runner.ts validate 0x1234...

# Check graph status
npx ts-node src/agent-runner.ts status 0x1234...
```

## Jadex BDI Agents (Java)

For production use with full BDI semantics, use the Jadex implementation.

### Build

```bash
cd jadex-project
mvn clean package
```

### Run

```bash
# Run pipeline
java -jar target/mkmpol21-bdi-agents-1.0.0.jar pipeline

# Check roles
java -jar target/mkmpol21-bdi-agents-1.0.0.jar roles

# Validate a graph
java -jar target/mkmpol21-bdi-agents-1.0.0.jar validate 0x1234...
```

## Agent Architecture

```
                    +------------------+
                    | Coordinator      |
                    | Agent            |
                    | (MFSSIA_Guardian)|
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
+--------+-------+  +--------+-------+  +--------+-------+
| Syntax         |  | Semantic       |  | DAO            |
| Validator      |  | Validator      |  | Submitter      |
| (Data_Validator)|  | (Data_Validator)|  | (Member_Inst)  |
+----------------+  +----------------+  +----------------+
```

## Agent Accounts (Hardhat)

| Agent | Address | Role |
|-------|---------|------|
| Coordinator | `0xBcd4...4096` | MFSSIA_Guardian_Agent (index 2) |
| Syntax Validator | `0x71bE...5788` | Data_Validator (index 4) |
| Semantic Validator | `0xFABB...94a` | Data_Validator (index 4) |
| DAO Submitter | `0x1CBd...9Ec` | Member_Institution (index 0) |

## Validation Pipeline

1. **DAO Submitter Agent** receives RDF file from NLP pipeline
2. **DAO Submitter Agent** computes content hash and submits to GADataValidation contract
3. **Coordinator Agent** detects `RDFGraphSubmitted` event
4. **Syntax Validator Agent** runs Apache Jena RIOT validation
5. **Syntax Validator Agent** calls `markRDFGraphValidated(graphId, true)`
6. **Semantic Validator Agent** runs SHACL shapes validation
7. **Validation Committee** reviews and calls `approveRDFGraph(graphId)`
8. **Owner** publishes to OriginTrail DKG via `markRDFGraphPublished(graphId, ual)`

## API Endpoints

The agents communicate with the DAO via REST API:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/bdi-agent/submit` | Submit RDF graph |
| `POST /api/bdi-agent/validate` | Mark graph validated |
| `POST /api/bdi-agent/status` | Get graph status |
| `POST /api/bdi-agent/check-permission` | Check agent permission |

## Contract Addresses (Localhost)

```
MKMPOL21:         0xB7ca895F81F20e05A5eb11B05Cbaab3DAe5e23cd
GADataValidation: 0xe044814c9eD1e6442Af956a817c161192cBaE98F
```

## Environment Variables

Create a `.env` file in the bdi-agents directory:

```env
# RPC URL
HARDHAT_RPC_URL=http://localhost:8545

# Contract addresses
MKMPOL21_ADDRESS=0xB7ca895F81F20e05A5eb11B05Cbaab3DAe5e23cd
GA_DATA_VALIDATION_ADDRESS=0xe044814c9eD1e6442Af956a817c161192cBaE98F

# API URL (for Jadex agents)
API_BASE_URL=http://localhost:3000/api/bdi-agent
```

## Sample Employment Event RDF

```turtle
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
```
