# 📚 ontology/

This folder contains the ontologies, RDF schemas, and semantic vocabularies developed for the **blockchain-based Decentralized Knowledge Graph (DKG)** in the MKM-POL21-2025 project. The ontological layer ensures semantic interoperability, traceability, and machine reasoning capabilities across decentralized media archives, digital cultural heritage records, and AI-driven agents.

---

## 🎯 Purpose

The ontologies defined in this folder enable:

- **Structured representation of cultural and media metadata** that can be shared and verified across systems.
- **Semantic alignment between DAO governance concepts, identity/authentication logic (MFSSIA), and knowledge assets** stored in the OriginTrail DKG v8 infrastructure.
- **Support for AI-based reasoning** by ElizaOS agents, facilitating intelligent query answering, context inference, and trust scoring.
- **Verifiable and decentralized publishing of digital assets**, via RDF and cryptographically anchored triples.

---

## 🔗 Project Context

This ontology work is central to realizing the project’s goals of:

- **Creating a verifiable, participatory cultural data infrastructure** for Estonia and EU-wide datasets (e.g., from ERR, DIGAR, and EFIS).
- **Allowing decentralized agents and DAOs to reason over, control, and curate linked data** while preserving provenance and authenticity.
- **Bridging the gap between legacy metadata standards (e.g., EBUCore, Dublin Core, EDM)** and blockchain-verifiable semantics.

---

## 🧠 Ontologies Maintained Here

The folder includes both **custom ontologies** designed for the project and **mappings to existing standards**:

| Ontology File                        | Description                                                                 |
|--------------------------------------|-----------------------------------------------------------------------------|
| `mkm-core.owl`                       | Core ontology defining agents, datasets, governance objects, and roles     |
| `dkg-provenance.owl`                 | Extensions to PROV-O and OriginTrail vocabularies for decentralized contexts|
| `dao-ml-schema.owl`                  | Ontological mapping of DAO-ML constructs to semantic roles and permissions |
| `mfssia-auth.owl`                    | Concepts related to MFSSIA identity, credential types, and challenge sets  |
| `media-asset.ttl`                    | RDF vocabularies for video, audio, and transcript annotation in DKG        |
| `alignments/ebu-dublin-edm.ttl`      | Alignment mappings to EBUCore, Dublin Core, and Europeana Data Model       |

---

## 🧩 Integration Points

- 🔗 **With DKG**: Ontologies define the schema for publishing assets via OriginTrail v8 Edge Nodes, ensuring data is machine-readable, semantically tagged, and cryptographically verifiable.
- 🔐 **With MFSSIA**: Role, credential, and permission classes link governance metadata with user identities and authentication logic.
- 🧠 **With AI Agents**: Enables LLMs and ElizaOS agents to reason over asset types, permissions, trust relationships, and organizational roles.
- 🧰 **With DAO-ML**: Semantic labels in DAO-ML models are linked to ontological terms, allowing consistent governance logic across smart contracts and the knowledge graph.

---

## 🧱 Folder Structure

```plaintext
ontology/
├── core/                  # Core MKM ontologies (agents, datasets, governance)
├── mfssia/                # Ontologies for self-sovereign identity & challenge sets
├── dao-ml/                # Semantic interpretation of DAO model constructs
├── media/                 # Cultural media schemas and annotation vocabularies
├── alignments/            # Mappings to Dublin Core, EDM, EBUCore
├── examples/              # Sample RDF triples and SPARQL queries
└── docs/                  # Diagrams, design notes, term definitions

