# 🤖 ai_agents/

This folder contains the logic, scripts, and configurations for developing **AI-powered agents** that operate on top of the Decentralized Knowledge Graph (DKG), enabling autonomous reasoning, semantic enrichment, contextual alerting, and self-organized DAO participation. These agents follow the **ElizaOS agent specification** from OriginTrail DKG v8 and are designed to support decentralized governance of cultural and media knowledge assets.

---

## 🎯 Purpose

The `ai_agents/` module enables:

- **Autonomous curation** of RDF assets based on AI reasoning and learned patterns.
- **Participatory governance** through automated DAO proposal generation and evaluation.
- **Semantic linking and trust scoring** for incoming knowledge graph assets.
- **Natural language summarization, translation, and classification** of unstructured content (e.g., transcripts, subtitles, descriptions).
- **Federated learning and distributed retraining** for improving annotation models across edge nodes.

These agents play a key role in realizing the **intelligent orchestration of data and decisions** within the MKM-POL21-2025 ecosystem.

---

## 🧠 Agent Types

The following categories of AI agents are envisioned:

| Agent Type             | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `CuratorAgent`         | Monitors new assets and links them semantically using ontology rules        |
| `GovernanceAgent`      | Proposes DAO policy adjustments based on DKG trends and user behavior       |
| `TrustScorerAgent`     | Assigns trust and quality scores to new RDF submissions                     |
| `SummarizerAgent`      | Generates readable summaries of transcripts, metadata, or annotations       |
| `ClassifierAgent`      | Tags media assets (audio/video/text) using pretrained models                |
| `AlertingAgent`        | Detects anomalies or patterns and triggers DAO-based policy changes         |

All agents are designed to interact with DAO smart contracts and MFSSIA-based role access controls.

---

## 🧰 Folder Structure

```plaintext
ai_agents/
├── curator/                    # Agents that monitor and semantically link RDF assets
├── governance/                 # DAO-driven decision recommendation agents
├── trust/                      # Confidence and integrity scoring mechanisms
├── nlp/                        # Summarization, classification, translation models
├── eliza_config/               # JSON configs for ElizaOS compatibility
├── templates/                  # Proposal and publication templates used by agents
├── training/                   # Sample data and training sets for fine-tuning LLMs
└── examples/                   # Demo runs and simulation traces

