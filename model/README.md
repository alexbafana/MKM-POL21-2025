# 📂 model/

This folder contains the **DAO-ML models** developed for the MKM-POL21-2025 project. These models serve as formal, machine-readable specifications of decentralized governance structures for managing and evolving the blockchain-based Decentralized Knowledge Graph (DKG) designed for the Estonian media and creative industries.

---

## 🧭 Purpose

The DAO-ML models in this folder are used to:
- Visually and formally **model Decentralized Autonomous Organizations (DAOs)**.
- Define the **governance logic, roles, permissions, and decision-making structures** that control DKG lifecycle management.
- Serve as the **source input for automatic code generation**, particularly smart contracts in Solidity, which are deployed to enforce DAO rules on-chain.
- Enable traceability, simulation, and validation of governance before any on-chain execution occurs.

---

## 🛠 What is DAO-ML?

DAO-ML is a **domain-specific modeling language (DSL)** for decentralized governance. It allows stakeholders to collaboratively design:
- **Organizational roles** (e.g. curator, validator, oracle agent, community council)
- **Voting procedures** and thresholds (e.g. token-based, quadratic, delegated)
- **Lifecycle hooks** for smart contract execution (e.g. proposal creation, quorum check, parameter update)
- **Tokenomics** mappings (e.g. stake-weighted rights, rewards, penalties)

DAO-ML is defined in XML format, and each file in this folder conforms to a formally defined XSD schema to ensure structural correctness and semantic clarity.

---

## 🧱 Structure of Models

Each file in this directory represents a modular component of the larger DAO system, such as:

| File                          | Purpose                                                      |
|-------------------------------|--------------------------------------------------------------|
| `governance_core.xml`         | Root DAO specification with high-level rules and permissions |
| `role_definitions.xml`        | Definitions of organizational roles and actor types          |
| `voting_mechanisms.xml`       | Voting rules, quorum conditions, proposal flows              |
| `token_policy.xml`            | Token-related rules: staking, minting, burning               |
| `access_control.xml`          | MFSSIA-integrated access and identity logic                  |

Each file will be parsed and transformed by the DAO-ML generator found in the `generator/` folder to produce executable smart contracts.

---

## 🧩 Integration with Other Project Components

This folder connects to the rest of the MKM infrastructure as follows:

- 🔗 **Smart Contracts**: DAO-ML files are input to the `generator/` which outputs Solidity code deployed on Ethereum-compatible blockchains.
- 🧠 **AI Agents**: DAO-defined governance policies will shape ElizaOS agents’ access rights and decision-making contexts for DKG v8.
- 🛡 **MFSSIA**: Role-based challenge-response logic defined in `model/` is enforced through cryptographic checks implemented in `mfssia/`.
- 🧠 **Ontology alignment**: Role and process definitions in DAO-ML will be semantically linked to ontological terms in `ontology/`.

---

## 📐 How to Use

1. **Edit models** using any XML-aware editor (e.g. VSCode with XML plugin).
2. **Validate** with the DAO-ML XSD schema provided in `/docs/schema/`.
3. **Generate smart contracts** using the translation tools in `generator/`.
4. **Deploy to blockchain**, either manually or through CI/CD pipelines.
5. **Link roles and processes to MFSSIA identities and AI agents**.

---

## 🧪 Example Use Cases

- **Media Dataset Governance**: Defining who can curate, annotate, or publish RDF data in the OriginTrail-based DKG.
- **Token Economy Management**: Setting voting logic for budgeting community tokens toward annotation tasks or AI training.
- **Access Control**: Modeling role-gated access to linked digital assets or proposals that affect the public cultural record.

---

## 📄 File Format

All DAO-ML files are:
- XML 1.1 compliant
- Validated against the central DAO-ML schema
- UTF-8 encoded
- Named with lower_snake_case to reflect functional modularity

---

## 🚧 Status

DAO-ML is under active development. Expect schema evolution, integration hooks with Solidity, and tight linkage to the ontology and DKG structures as the project progresses toward its 2025 prototype milestone.

---

## 📬 Contact

For questions about modeling standards or contributions to this folder, contact:

**Alex Norta**  
Tallinn University / Dymaxion OÜ  
[alex.norta.phd@ieee.org](mailto:alex.norta.phd@ieee.org)

---

