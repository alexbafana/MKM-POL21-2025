# ⚙️ ElizaOS Agent Configuration

This folder contains **configuration files for deploying AI agents** within the [OriginTrail ElizaOS](https://origintrail.io/elizaos) framework, which supports semantic agents operating over the Decentralized Knowledge Graph (DKG). These agents serve as autonomous, cryptographically verifiable actors that perform curation, trust scoring, proposal generation, and content enrichment as part of the MKM-POL21-2025 ecosystem.

---

## 🎯 Purpose

ElizaOS agents enable:

- **Autonomous execution** of semantic tasks across OriginTrail edge nodes.
- **Standardized lifecycle and interoperability** between decentralized services.
- **Role-based control** over agent behavior using MFSSIA and DAO-ML permissions.
- **Inter-agent communication**, publishing, and governance participation.
- **Provable reasoning** using RDF inputs and cryptographically anchored results.

This folder defines how MKM-specific agents should behave, authenticate, and interact with the DKG and DAOs via ElizaOS APIs.

---

## 🧠 What is ElizaOS?

ElizaOS is a **semantic operating system for the decentralized web**, enabling agents to:

- Run in trusted execution environments
- Interface with DKG nodes using verifiable credentials
- Automate RDF ingestion, querying, and publication
- Support governance decision-making through DAO interoperability

It is a core infrastructure layer for OriginTrail DKG v8 and its AI-native agents.

---

## 📁 Folder Structure

| File                           | Description                                                                |
|--------------------------------|----------------------------------------------------------------------------|
| `curator_agent.config.json`    | Runtime config for RDF monitoring and semantic enrichment tasks            |
| `governance_agent.config.json` | Rules for DAO proposal triggers, voting behavior, and explanation logging  |
| `trust_agent.config.json`      | Scoring thresholds, identity filters, and publication strategy             |
| `nlp_agent.config.json`        | Language support, model invocation parameters, and result formatting        |
| `global_settings.json`         | Shared settings: heartbeat interval, API endpoints, logging mode           |
| `mfssia_roles.map.json`        | Agent-role mapping with MFSSIA credential expectations                     |
| `eliza_manifest.json`          | Agent capability declaration for registration with ElizaOS agent registry  |

---

## 🔐 Authentication and Roles

Agent permissions are enforced via:

- **MFSSIA challenge set definitions** (stored in `/mfssia/`)
- **DAO role bindings** defined in DAO-ML and smart contracts
- Configurable **access levels** in `mfssia_roles.map.json`:
  ```json
  {
    "curator_agent": ["Curator", "Publisher"],
    "trust_agent": ["Validator"],
    "governance_agent": ["Proposer", "Delegate"]
  }

