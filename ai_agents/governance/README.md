# 🏛 Governance Agents

This folder contains the logic and configuration for **AI-powered governance agents** that autonomously interact with DAO-based decision-making processes. These agents analyze semantic graph activity, identify governance-relevant trends or risks, and generate or vote on proposals in accordance with DAO rules defined in the MKM-POL21-2025 ecosystem.

---

## 🎯 Purpose

Governance agents serve as intelligent, accountable participants in DAO workflows by:

- Monitoring proposal activity, vote outcomes, and token distributions.
- Recommending new policy changes based on trends observed in the DKG.
- Evaluating the semantic impact or trust risk of newly published assets.
- Acting as DAO or sub-DAO delegates, casting votes based on pre-trained logic or LLM-driven reasoning.
- Ensuring governance transparency by documenting decision pathways and publishing justifications to the DKG.

---

## 🧠 Key Capabilities

- **Proposal generation**: Trigger proposals for policy changes, curation thresholds, access restrictions, or token reallocation.
- **Voting behavior modeling**: Rule-based, utility-optimized, or LLM-supported rationale voting.
- **Governance pattern mining**: Detect centralization, inactive roles, or anomalous voting behavior.
- **Explanation tracking**: Document decision support logic for DAO transparency.

---

## 📁 Structure

| File or Folder             | Description                                                                |
|----------------------------|----------------------------------------------------------------------------|
| `governance_agent.py`      | Main loop for decision monitoring, voting, and proposal triggering         |
| `proposal_rules/`          | YAML/JSON rules for auto-generating proposals                              |
| `delegation_profiles/`     | Voting preferences and decision profiles by agent persona or DAO role      |
| `metrics/`                 | Scripts to compute voting trends, quorum failures, and role effectiveness  |
| `logs/`                    | Justifications and records of agent participation in governance            |
| `tests/`                   | Evaluation scenarios for DAO simulation and policy evolution               |

---

## 🔗 Integration

- **DAO-ML**: Governance agent behavior aligns with DAO structures defined in `/model/` and enforced in `/generator/` contracts.
- **DKG**: Semantic asset trends and RDF metadata drive proposal triggers and governance adaptation.
- **MFSSIA**: Agent identities are verified via challenge sets before submitting or voting on proposals.
- **Templates**: Uses standardized proposal formats from `/templates/`.

---

## 🧪 Example Use Case

1. A curator agent detects repeated submission of low-trust RDF assets.
2. Governance agent evaluates this as a potential attack pattern.
3. Agent triggers a DAO proposal to increase staking requirements for RDF publishers.
4. The proposal is auto-justified using data from `metrics/`.
5. The agent may vote on the proposal or await DAO community action.

---

## 🚀 How to Run

```bash
python3 governance_agent.py --dao media_curation_dao

