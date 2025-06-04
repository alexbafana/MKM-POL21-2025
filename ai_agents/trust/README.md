# 🔎 Trust Agents

This folder contains the logic, models, and reasoning mechanisms for **AI agents that assess the trustworthiness, quality, and integrity of RDF assets** published in the Decentralized Knowledge Graph (DKG). These trust agents are a key component in enabling transparent, token-incentivized, and community-auditable knowledge curation within the MKM-POL21-2025 semantic governance ecosystem.

---

## 🎯 Purpose

Trust agents autonomously:

- Assign **confidence scores** to RDF triples, graphs, or asset bundles based on provenance, author identity, temporal relevance, semantic completeness, and community reputation.
- Generate **verifiable proofs or explanations** for their trust evaluations.
- Trigger alerts or DAO proposals in the presence of anomalies, spam, or suspected disinformation.
- Maintain a dynamic **trust index** across DKG actors, content categories, and curatorial performance.

These agents contribute to a decentralized system of **semantic truth scoring**, enhancing reliability in a multi-stakeholder media ecosystem.

---

## 🔐 Trust Signal Inputs

Trust agents evaluate and aggregate signals such as:

- ✅ Identity provenance (MFSSIA-authenticated role and credential)
- 🕒 Temporal consistency (publication lag, recency)
- 🧠 Ontological completeness (class/property coverage, semantic density)
- 🤝 Community endorsements or DAO-curated votes
- 🔁 Reuse, contradiction, or alignment with existing knowledge in DKG

---

## 📁 Structure

| File or Folder              | Description                                                               |
|-----------------------------|---------------------------------------------------------------------------|
| `trust_agent.py`            | Core scoring agent script with pluggable signal analyzers                 |
| `signal_models/`            | Configurable logic for individual trust signals                           |
| `composite_strategies/`     | Aggregation methods (e.g., weighted sum, Bayesian inference, LLM prompts) |
| `evaluation_logs/`          | JSON logs of scoring results and explanations                             |
| `reputation_index.json`     | Historical trust scores per user/role/asset type                          |
| `tests/`                    | Simulated RDF graph assessments and scoring validation                    |

---

## 🔗 Integration

- **DKG (`/dkg/`)**: Trust agents scan new RDF assets, score them, and optionally enrich them with trust annotations before republishing.
- **MFSSIA (`/mfssia/`)**: Verifies the identity and credential level of content authors to modulate scoring weights.
- **DAO-ML (`/model/`)**: Agent recommendations can be enforced as DAO-gated acceptance thresholds for content.
- **Governance Agents**: Collaborate with governance agents to trigger proposals when system trust metrics dip below tolerable limits.

---

## 🧪 Example Use Case

1. A new RDF asset is submitted by a low-reputation publisher.
2. The trust agent:
   - Detects shallow ontology alignment.
   - Notes limited editorial history and expired credentials.
   - Computes a composite trust score: `0.42`.
3. Flags the asset as "requires review" and writes to the DKG with a justification hash.
4. Notifies governance agent for potential policy update on publisher staking.

---

## 🧠 Scoring Strategy Example

```json
{
  "scoring_model": "weighted_average",
  "weights": {
    "mfssia_credibility": 0.4,
    "ontology_alignment": 0.25,
    "temporal_recency": 0.15,
    "peer_support": 0.2
  },
  "thresholds": {
    "high": 0.75,
    "medium": 0.5,
    "low": 0.25
  }
}

