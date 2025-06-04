# 🧪 AI Agent Examples

This folder contains **executable demonstration scenarios and simulation traces** showcasing how different types of AI agents operate within the MKM-POL21-2025 decentralized knowledge infrastructure. Each example illustrates an integrated workflow involving semantic asset monitoring, trust scoring, NLP enrichment, or governance participation driven by autonomous agents.

---

## 🎯 Purpose

The examples in this folder are intended to:

- **Demonstrate real-world use cases** for each AI agent class (e.g., curator, trust scorer, governance delegate).
- Serve as **testbeds** for validating the correctness, coherence, and reliability of agent logic.
- Provide **tutorials and reference flows** for developers extending the MKM infrastructure.
- Facilitate **academic reproducibility** of design-science artifacts developed in the project.

Each example is accompanied by input data, execution scripts, expected outputs, and logging artifacts.

---

## 📁 Folder Structure

| Subfolder                          | Description                                                                 |
|------------------------------------|-----------------------------------------------------------------------------|
| `curation_flow/`                   | Demonstrates RDF asset enrichment and linking via curator agent             |
| `trust_scoring/`                   | Runs a trust agent on new content with signal trace and scoring rationale   |
| `governance_proposal/`            | Shows governance agent proposing a policy update based on DKG trend         |
| `summary_generation/`             | NLP agent summarizes transcript and links entities in RDF                   |
| `translation_workflow/`           | Multilingual enrichment and publishing of RDF content (ET-EN-FI)            |
| `anomaly_alert/`                   | Triggers semantic alert and notifies DAO of suspicious RDF asset behavior   |
| `multi-agent_simulation/`         | Simulated interaction between multiple agents on a shared RDF update set    |

---

## 🧠 Example: RDF Trust Scoring

The `trust_scoring/` example simulates how an RDF metadata file is analyzed by the trust agent. Steps:

1. Load RDF from `input/err_segment_2025.ttl`
2. Evaluate based on:
   - Author's MFSSIA credential
   - Ontology alignment
   - Time of publication
   - Peer endorsements
3. Compute and log score to `output/trust_report.json`
4. Optionally publish annotated RDF to DKG

To run:

```bash
cd trust_scoring/
python3 run_scoring.py --rdf input/err_segment_2025.ttl

