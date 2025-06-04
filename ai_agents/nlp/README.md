# 🧠 NLP Agents

This folder contains **Natural Language Processing (NLP) models, pipelines, and agents** used for enhancing the semantic depth and usability of media-related knowledge assets in the Decentralized Knowledge Graph (DKG). These NLP agents process transcripts, descriptions, annotations, and linked metadata to support multilingual, cross-modal, and context-aware reasoning within the MKM-POL21-2025 infrastructure.

---

## 🎯 Purpose

The NLP agents contribute to the ecosystem by:

- Generating **summaries** of media content (transcripts, subtitles, articles).
- Performing **named entity recognition** (NER), linking entities to ontology terms.
- Translating metadata and annotations across **Estonian, English, Finnish**, and other EU languages.
- **Classifying content** by topic, sentiment, or quality for DAO or trust-based governance.
- Feeding structured content into the **AI agent pipeline** for proposal creation or trust scoring.

These agents make the decentralized knowledge graph more **searchable, linkable, and human-readable**—across languages and stakeholder types.

---

## 🧩 Integration Points

- 🔗 **DKG**: NLP agents monitor RDF updates and enrich or summarize the textual literals.
- 🔐 **MFSSIA**: Agent access is authenticated before publishing NLP-generated content.
- 🧠 **Curator & Governance Agents**: NLP outputs are used to improve RDF coherence and provide justifications for governance decisions.
- 🗂 **Ontologies**: Outputs are mapped to concepts from `/ontology/` (e.g., mkm-core.owl, media vocabularies).

---

## 📁 Structure

| File or Folder               | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| `summarizer.py`              | Summarizes transcripts and long-form text using Hugging Face or GPT        |
| `ner_linker.py`              | Performs entity recognition and links to ontology concepts                 |
| `translator.py`              | Language detection and multilingual translation (Estonian, EN, FI, etc.)   |
| `classifier.py`              | Assigns content categories (e.g., genre, theme, relevance)                 |
| `config/`                    | Language model and API configuration files                                 |
| `outputs/`                   | NLP outputs (summaries, entity annotations, translated literals)           |
| `tests/`                     | NLP pipeline test cases for different asset types                          |

---

## 🌍 Supported Languages

- 🇪🇪 Estonian
- 🇬🇧 English
- 🇫🇮 Finnish
- 🇩🇪 German
- 🇫🇷 French (experimental)

Uses language-specific models when available (e.g., `EstBERT`, `Voikko`, `Opus-MT`, `XLM-RoBERTa`).

---

## 🔄 Example Workflow: Transcript Summarization and Linking

1. A new RDF asset with a long transcript is published to the DKG.
2. `summarizer.py` generates an Estonian and English abstract.
3. `ner_linker.py` identifies named persons, places, and works, and links them to ontology IRIs.
4. `translator.py` prepares cross-lingual variants for search interoperability.
5. Results are added as RDF literals to the original asset and re-published to the DKG.

---

## 🚀 How to Run

```bash
python3 summarizer.py --input data/film_transcript.txt --lang et

