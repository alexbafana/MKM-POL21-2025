# 📁 examples/

This folder contains **executable, curated examples and case studies** that demonstrate how the components of the MKM-POL21-2025 decentralized knowledge governance framework work together in real-world scenarios. Each example showcases an integrated pipeline involving DAO modeling, smart contract deployment, semantic metadata management, decentralized knowledge graph publishing, AI-powered curation, and MFSSIA-authenticated access control.

These examples are intended both for demonstration and for testing the robustness, interoperability, and usability of the platform under various application contexts in the cultural and media sector.

---

## 🎯 Purpose

The `examples/` folder is designed to:

- Illustrate the **practical use** of DAO-ML, the generator, and the DKG infrastructure.
- Provide **templates and walkthroughs** for new users and developers.
- Serve as **validation artifacts** for design-science evaluations and stakeholder feedback loops.
- Support reproducibility of results during prototyping, testing, or evaluation by public agencies or research partners.

---

## 🧪 Example Categories

| Subfolder                    | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| `media_dao/`                 | A complete DAO lifecycle for community-based curation of media metadata     |
| `student_content/`           | Distributed publishing and trust scoring of student-generated cultural assets |
| `tourism_network/`           | Mutual credit DAO token economy for regional tourism knowledge sharing     |
| `mfssia_roles/`              | Examples of identity-challenge-based role access in DAO workflows           |
| `ai_integration/`            | Agent-driven RDF enrichment, summarization, and proposal generation         |
| `err_archive_pipeline/`      | Semantic publishing of broadcast metadata from ERR through DKG + DAO gate  |
| `crossborder_linking/`       | Multilingual content linking across Estonian and EU film datasets           |

---

## 🧩 Integration Pathways Demonstrated

Each example links together several core components:

- 📦 **DAO-ML XML models** for organizational logic.
- 🔁 **Smart contract generation** using the DAO-ML generator.
- 🧠 **Ontological tagging and metadata annotation** for cultural assets.
- 🌐 **RDF graph publishing to OriginTrail DKG** using `dkg/` tooling.
- 🔐 **MFSSIA challenge-response authentication** for publishing permissions.
- 🤖 **AI-based agent reasoning and proposal creation** in autonomous curation scenarios.

---

## 📜 Example: Community Media DAO

A full lifecycle example (`media_dao/`) demonstrating:

1. **DAO-ML model** of community roles: `viewer`, `curator`, `moderator`, `admin`.
2. **Generated Solidity contracts** governing proposal flow and access policies.
3. **MFSSIA challenge set** requiring a verified cultural worker credential and biometric challenge to publish new assets.
4. **RDF asset** describing an interview with a filmmaker, semantically tagged using `mkm-core.owl`.
5. **AI agent (Summarizer)** auto-generates multilingual abstracts and links the asset to related interviews.
6. **DAO Proposal** is created to boost visibility for underrepresented directors.
7. **Votes** are cast and verified on-chain; policy update is executed automatically.

---

## 🛠 How to Run an Example

1. Clone the repository and install dependencies:
   ```bash
   pip install -r requirements.txt

