# 🏋️ AI Agent Training Data

This folder contains **datasets, fine-tuning corpora, labeled examples, and training configurations** used to adapt and optimize AI agents for semantic processing tasks in the MKM-POL21-2025 decentralized knowledge governance framework.

These resources support the development of agents capable of performing summarization, classification, trust scoring, metadata enrichment, and multilingual content handling aligned with Estonian and EU media contexts.

---

## 🎯 Purpose

The training folder serves to:

- Provide domain-specific **datasets for supervised learning and fine-tuning**.
- Host **benchmark examples** for evaluating agent accuracy, bias, and reasoning depth.
- Enable controlled testing of **model behavior under multilingual and semantically complex scenarios**.
- Ensure **transparent and reproducible AI agent behavior** in alignment with the governance and trust requirements of the MKM project.

---

## 📁 Folder Structure

| Subfolder/File                     | Description                                                               |
|------------------------------------|---------------------------------------------------------------------------|
| `summarization/`                   | Text-transcript-summary pairs for training media content summarizers      |
| `classification/`                  | Tagged content with genre, theme, or relevance labels                     |
| `entity_linking/`                  | Annotated corpora for named entity recognition and ontology linking       |
| `translation/`                     | Parallel corpora for Estonian–English–Finnish translations                |
| `rdf_enrichment/`                  | Triplet-level annotations for suggesting missing RDF properties           |
| `trust_signals/`                   | Labeled examples of trustworthy vs. low-integrity content submissions     |
| `config/`                          | Model configuration and tokenizer settings for reproducible fine-tuning   |
| `benchmark_scores.json`            | Agent evaluation metrics from validation sets                             |

---

## 🧠 Sample Task Definitions

### 📝 Summarization
- Input: Long interview transcript (Estonian)
- Output: 3-sentence summary in Estonian + English
- Format: `.jsonl` with `{"text": ..., "summary_et": ..., "summary_en": ...}`

### 🔎 Classification
- Input: RDF textual literals from film metadata
- Output: Class labels such as `"documentary"`, `"archival"`, `"interview"`
- Format: `.csv` with `text,label` columns

### 🧬 Entity Linking
- Input: Person and place names from content descriptions
- Output: Linked IRI to `mkm-core.owl` or external vocabularies (e.g., Wikidata)
- Format: `.tsv` with `entity_text`, `iri`, `confidence`

---

## 🛠 How to Use for Fine-Tuning

Example (using Hug

