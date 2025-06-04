# Decentralized Knowledge Graph for Semantic Media Governance

This repository hosts the code, models, and tooling for building a decentralized knowledge graph (DKG) integrated with blockchain-based governance mechanisms. The project is part of the **Estonian MKM-POL21-2025 initiative**, which aims to create a verifiable, interoperable, and semantically enriched infrastructure for managing digital cultural content across the EU.

## 🔍 Project Overview

The project focuses on:

* **Designing and generating DAO governance structures** using DAO-ML, a visual modeling language tailored for decentralized autonomous organizations.
* **Creating a blockchain-anchored decentralized knowledge graph** for curated cultural and media datasets, such as those from Estonian public broadcasters and film archives.
* **Enabling semantic interoperability** between content repositories through RDF-compliant ontologies and integration with OriginTrail’s DKG infrastructure.

## 🔧 Key Features

* **DAO-ML Modeling Language**: Graphical DSL for modeling organizational roles, permissions, and decision-making processes.
* **Smart Contract Code Generation**: Automatic Solidity generation from DAO-ML models, optimized for scalability and upgradability.
* **ANTLR + XSD + XPath Tooling**: Formal grammar definitions and XML-based validation for model consistency.
* **OriginTrail Integration**: Future-proof DKG publishing through OriginTrail v8 stack (Eliza OS agents, Edge Nodes, and semantic asset anchoring).
* **Multiple Use Cases**:

  * Mutual credit tokenization for regional tourism networks.
  * Distributed curation and monetization of student-produced cultural media assets (e.g. via EFIS).

## 📁 Structure

* `/model`: DAO-ML models (XML)
* `/generator`: DAO-ML to Solidity translator
* `/ontology`: RDF schemas and domain ontologies
* `/examples`: Case studies and demonstration datasets
* `/docs`: Documentation and design science research artifacts

## 🧪 Methodology

The project follows the **Design Science Research (DSR)** methodology and involves iterative development, evaluation through real-world case studies, and rigorous validation using formal grammars and schema constraints.

## 🛠 Technologies Used

* **Solidity**, **Ethereum**
* **Python**, **XPath**, **ANTLR**
* **XML/XSD for model structure**
* **OriginTrail DKG v8**
* **RDF, OWL, SPARQL**

## 📜 License

This project is released under the **Apache License 2.0**, promoting open innovation and permissive reuse with patent protection.

## 👥 Contributors

* Alex Norta (Tallinn University)
* Sowelu Avanzo (University of Torino)
* Sunday Aroh (Tallinn University)
* Alexandr Kormiltsyn (Tallinn University)
* Indrek Ibrus (Tallinn University, Baltic Film, Media and Arts School)
* Andres Kõnno (Tallinn University)

## 🌍 Acknowledgements

Supported by the **Estonian Ministry of Economic Affairs and Communications (MKM)** under the **POL21-2025** strategic research framework. Developed in collaboration with European creative media faculties and technology partners.
