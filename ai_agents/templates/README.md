# 🧾 Agent Templates

This folder contains reusable **templates for DAO proposals, publication announcements, metadata enrichment statements, and governance justifications** used by AI agents operating in the MKM-POL21-2025 semantic infrastructure. These templates ensure that agent-generated outputs are consistent, verifiable, multilingual-ready, and compatible with DAO and DKG formats.

---

## 🎯 Purpose

AI agents use templates to:

- Submit structured **DAO proposals** (e.g. policy changes, funding reallocations, new curation workflows).
- Generate **human-readable justifications** for governance decisions (e.g. vote reasons, proposal logic).
- Publish **annotated metadata** and **semantic summaries** to the Decentralized Knowledge Graph (DKG).
- Ensure outputs are **DAO-compliant**, MFSSIA-verified, and ready for review by humans and agents.

Templates promote **standardization, transparency, and governance auditability** in AI-agent interactions.

---

## 📁 Folder Structure

| Template File                          | Description                                                        |
|----------------------------------------|--------------------------------------------------------------------|
| `dao_proposal_template.md`             | Markdown structure for new DAO proposals triggered by agents       |
| `vote_justification_template.md`       | Justification format for agent-cast votes                          |
| `rdf_enrichment_template.ttl`          | Template for generating enriched RDF assets with agent output      |
| `publication_notice_template.md`       | Content for publishing a new asset entry to the DKG                |
| `summary_template_et.md`               | Estonian summary structure for NLP-generated abstracts             |
| `summary_template_en.md`               | English equivalent for parallel RDF literals                       |
| `semantic_alert_template.md`           | Message structure for anomaly detection or content abuse alerts    |
| `agent_signature_block.md`             | Agent DID and MFSSIA challenge hash appended to all templates      |

---

## 🔁 How Agents Use Templates

1. **Fill Placeholders**: Templates include variables (e.g. `{{agent_id}}`, `{{proposal_title}}`, `{{rdf_asset_uri}}`).
2. **Inject Content**: Agent logic parses and fills the templates at runtime.
3. **Log and Publish**: Completed content is logged, stored, and optionally published to the DAO or DKG.
4. **Anchor Proof**: Hash of the rendered template may be anchored on-chain to ensure verifiability.

---

## 🧠 Example: DAO Proposal Template (Markdown)

```markdown
## 🗳 Proposal: {{proposal_title}}

**Initiated by**: {{agent_id}}  
**Role**: {{role}}  
**Rationale**:  
{{proposal_summary}}

**Impact Score**: {{estimated_impact}}  
**Proposed Action**:  
{{action_plan}}

**Linked RDF Asset**: [{{rdf_uri}}]({{rdf_uri}})

**Submitted at**: {{timestamp}}  
**MFSSIA Credential Hash**: {{cred_hash}}

