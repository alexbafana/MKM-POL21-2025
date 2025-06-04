# 🧭 Curator Agents

This folder contains the logic and configuration for **AI curator agents** responsible for monitoring the Decentralized Knowledge Graph (DKG), detecting new or updated RDF assets, and semantically enriching them. These agents form a core component of the intelligent infrastructure in the MKM-POL21-2025 project.

---

## 🎯 Purpose

Curator agents autonomously:
- Observe RDF assets published to the DKG (e.g., by cultural institutions like ERR or EFIS).
- Enrich content by linking it to ontological terms, tagging missing metadata, or correcting inconsistencies.
- Propose semantic associations (e.g., linking a film director to previously unlinked productions).
- Notify DAO governance processes when curation actions require policy changes or community decisions.

These agents ensure that the decentralized knowledge graph remains **coherent, contextualized, and up-to-date**.

---

## 🛠 Features

- **Real-time RDF asset monitoring**
- **Ontology-based linking and alignment**
- **AI-assisted inference and enrichment**
- **Compatibility with OriginTrail v8 and ElizaOS**
- **Role-gated publishing controlled by MFSSIA identity logic**

---

## 📁 Structure

| File or Folder            | Description                                                   |
|---------------------------|---------------------------------------------------------------|
| `curator_agent.py`        | Main logic for monitoring and curating RDF content            |
| `enrichment_rules/`       | Rule sets for semantic linking and validation                 |
| `linked_assets_log.json`  | Audit log of RDF assets enriched by the curator agent         |
| `rdf_hooks/`              | SPARQL-based handlers for modifying or validating triples     |
| `tests/`                  | Unit tests and agent simulation scenarios                     |

---

## 🔗 Integration

- **DKG**: Pulls RDF from the OriginTrail graph and republishes enriched versions.
- **Ontology**: Uses `/ontology/` OWL vocabularies for semantic reasoning.
- **DAO**: Can invoke proposal templates in `/templates/` when a curation event requires governance action.
- **MFSSIA**: Requires identity verification before publishing enriched RDF content.

---

## 🚀 How to Run

```bash
python3 curator_agent.py --watch dkg://mkm-public/ERR2025

