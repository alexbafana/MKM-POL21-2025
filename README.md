Here is the revised and extended `README.md` file with **proper integration of DKG**, **MFSSIA**, and **AI integration with DKG v8**, along with updates to the folder structure:

---

# Decentralized Knowledge Graph for Semantic Media Governance

This repository contains tools, models, and source code for building a **blockchain-anchored decentralized knowledge graph (DKG)** and a **DAO-governed semantic infrastructure** for media and cultural content. It is developed under the **Estonian MKM-POL21-2025 research initiative**, addressing the need for verifiable, interoperable, and decentralized public data infrastructures in the creative and media sectors.

---

## 🔍 Project Overview

The project integrates the following key components:

* **Decentralized Knowledge Graph (DKG)**: Creation of a blockchain-based semantic knowledge graph to store, verify, and query RDF-linked cultural datasets.
* **DAO-ML and Governance**: A graphical modeling and code generation framework (DAO-ML) for defining governance structures as smart contracts.
* **MFSSIA** (Multi-Factor Challenge Set Self-Sovereign Identity Authentication): Enables secure, sovereign identity validation for access control, content authorship, and voting within the DAO.
* **AI Integration for DKG v8**: AI agents (e.g., ElizaOS-compatible) will be developed to perform intelligent reasoning, autonomous curation, and trust scoring on DKG data, aligned with OriginTrail's v8 agent-based architecture.

---

## 🔧 Key Features

* **DAO-ML Modeling Language**: Visual modeling of DAO governance roles, permissions, and organizational hierarchies.
* **Solidity Code Generation**: Automatic translation of DAO-ML models into smart contracts, optimized for scalability and upgradeability.
* **Decentralized Knowledge Graph (DKG)**:

  * Publishing and anchoring RDF-compliant semantic assets on OriginTrail DKG v8.
  * Use of blockchain hashes to ensure data provenance, verifiability, and interoperability.
* **MFSSIA**:

  * A blockchain-based authentication layer using configurable challenge sets for access control and identity verification.
  * Integrates with the DAO and DKG to ensure secure identity-linked transactions.
* **AI-Driven Curation and Oracles**:

  * Use of ElizaOS agents and reasoning algorithms to semantically enrich datasets, assign trust scores, and automate governance proposals.
  * Future integration of LLM-based contextual understanding for autonomous knowledge graph validation and expansion.

---

## 📁 Repository Structure

```plaintext
/
├── /model                  # DAO-ML models (XML)
├── /generator              # DAO-ML to Solidity translation engine
├── /ontology               # RDF schemas, OWL ontologies
├── /dkg                    # Decentralized Knowledge Graph tooling and data
├── /mfssia                 # Identity challenge model and smart contract integration
├── /ai_agents              # AI curation tools and ElizaOS-compatible logic
├── /examples               # Use case models and simulation data
├── /docs                   # Design science research artifacts and documentation
```

---

## 🧪 Methodology

This project follows the **Design Science Research (DSR)** methodology to ensure that all developed artifacts (models, code, ontologies, governance structures) are rigorously grounded in theory and validated through real-world use cases.

The project integrates:

* Case study research and stakeholder co-design
* Formal modeling (DAO-ML, ontologies, grammars)
* AI-enhanced agent design
* Blockchain-based verification (smart contracts, RDF anchoring)

---

## 🛠 Technologies Used

* **Solidity**, **Ethereum**, **MetaMask**
* **ANTLR**, **XPath**, **Python**, **XSD**
* **RDF**, **OWL**, **SPARQL**
* **OriginTrail DKG v8**, **ElizaOS**, **Edge Nodes**
* **MFSSIA model**: Blockchain + off-chain authentication protocols
* **AI**: LLMs, decision trees, knowledge graph embeddings (planned)

---

## 📜 License

This project is licensed under the **Apache License 2.0**, enabling reuse, extension, and commercial application with patent protection.

---

## 👥 Contributors

* Alex Norta (Tallinn University, Dymaxion OÜ)
* Sowelu Avanzo (University of Torino)
* Sunday Aroh (Tallinn University)
* Alexandr Kormiltsyn (Tallinn University)
* Indrek Ibrus (Tallinn University, BFM)
* Andres Kõnno (Tallinn University)

---

## 🌍 Acknowledgements

This work is funded by the **Estonian Ministry of Economic Affairs and Communications (MKM)** under the **POL21-2025 strategic research framework**. It is carried out in collaboration with a consortium of European creative media faculties and decentralized web technology partners.
