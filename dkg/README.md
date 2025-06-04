# 🌐 dkg/

This folder contains the core logic, scripts, and configurations for building, publishing, querying, and validating a **Decentralized Knowledge Graph (DKG)** as part of the MKM-POL21-2025 project. The DKG anchors semantic metadata about cultural and media assets into a verifiable, trustable, and decentralized data structure using blockchain technology.

---

## 🎯 Purpose

The goal of this component is to implement a **semantic infrastructure for the Estonian media and cultural domain** that enables:

- Decentralized **curation**, **verification**, and **governance** of linked datasets (e.g., film metadata, broadcast archives, digital heritage).
- Integration with **DAO governance rules** to control access, publishing rights, and editorial processes.
- Compatibility with **OriginTrail DKG v8**, enabling data publishing via Edge Nodes, AI agents, and ElizaOS-based semantic agents.
- Use of blockchain (e.g., Ethereum or OriginTrail Parachain) for **anchoring proofs**, ensuring data immutability and trust.

---

## 🧠 Core Concepts

- **Decentralized Knowledge Graph (DKG)**: A blockchain-integrated RDF-based data structure distributed across a peer-to-peer network. It allows knowledge assets (triples, graphs, ontologies) to be queried, validated, and reasoned upon without relying on centralized authorities.
  
- **Semantic Anchoring**: Each published RDF graph is hashed and anchored on-chain, linking content and metadata to a cryptographic proof of authenticity and timestamp.

- **ElizaOS and AI Agents**: Smart agents (following OriginTrail’s ElizaOS standard) autonomously publish, monitor, and reason over DKG content, enabling intelligent feedback loops and participatory governance.

- **DAO Integration**: Every asset or content change published to the DKG can be subject to DAO approval workflows, token-based voting, or role-gated verification tied to MFSSIA-authenticated identities.

---

## 🧰 Components in This Folder

| File/Folder                  | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| `publish_to_dkg.py`          | Script for publishing RDF triples and anchoring them on OriginTrail        |
| `query_interface.py`         | SPARQL interface for querying local or remote DKG nodes                    |
| `eliza_agent_config.json`    | Configuration file for AI agents interfacing with DKG and DAO              |
| `node_registry.json`         | Registry of OriginTrail v8 edge nodes and agent endpoints                  |
| `dkg_schema_validator.py`    | Validates RDF content against SHACL/OWL rules before publishing            |
| `data/`                      | RDF samples from ERR, DIGAR, and EFIS repositories                         |
| `proofs/`                    | Blockchain transaction hashes and cryptographic proofs                     |
| `logs/`                      | Publication and reasoning activity logs (for auditability)                 |

---

## 🔗 Integration with Other Project Modules

- 🧠 **Ontology Layer (`ontology/`)**: RDF files published to the DKG are based on OWL ontologies that define cultural concepts, roles, provenance, and permissions.
- 🔐 **MFSSIA (`mfssia/`)**: Role-bound publishing rights and data access control are enforced via identity challenge sets linked to publishing agents.
- ⚙️ **Generator (`generator/`)**: DAO-generated smart contracts define workflows that control which assets can be added or amended in the DKG, under which quorum or token thresholds.
- 🧪 **AI Agents (`ai_agents/`)**: Autonomous agents observe DKG changes, suggest updates, and semantically enrich data through reasoning and feedback loops.

---

## 🚀 Usage Guide

### ✅ Publishing RDF to DKG

1. Place RDF file in `data/`, e.g.:
