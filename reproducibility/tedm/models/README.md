# Currynomics DAO-ML and Extended T-DM first drafts

Article: *Concentration-Aware Token Economy Design for DAO Engineering:
Linking Goals, Risks, and Engineering Requirements*

Journal: *Electronic Markets*

Authors: Alex Norta; Luca Pennella; Sowelu Avanzo; Samela Kivilo; Marie
Hattingh. Corresponding author: Alex Norta, Tallinn University, Estonia;
University of Pretoria, South Africa; Norta DeSyCo OÜ, Estonia
(alex.norta.phd@ieee.org).

This package gives Sowelu Avanzo an editable starting point for the model-
construction and validation task identified in Section 5. It is a first draft,
not evaluated case evidence and not an approved DAOMod model.

## Files

- `Currynomics_DAO-ML.drawio`: editable diagrams.net rendering of the DAO-ML
  organization and authority model.
- `Currynomics_ET-DM.drawio`: editable diagrams.net rendering of the DAOMod
  Extended Requirement Diagram.
- `Currynomics_DAO-ML.model.xml`: semantic DAO-ML instance conforming to the
  pinned DAOMod organization XSD.
- `Currynomics_ET-DM.model.xml`: semantic ERD instance conforming to the pinned
  DAOMod Extended Requirement Diagram XSD.

The `.drawio` files are diagrams.net XML. Open them directly in draw.io or
diagrams.net. The `.model.xml` files are DAOMod semantic XML, not draw.io files.
They preserve the element properties and references independently of layout.

## Authoritative basis

- Sowelu Avanzo, *A Model-Driven Method for Decentralized Autonomous
  Organization Development* (University of Torino PhD thesis, 2025), Chapters
  3–4, especially Tables 4.3–4.7 and Figures 4.1–4.2.
- DAOMod schemas and examples at commit
  `9ce3fc44dbb20d6441539f5992929746778bcbcc`.
- TEDM Section 4 outputs and Supplementary Tables S1–S6 and S12–S14.

The thesis supplies the notation semantics, grammar, XPath constraints, and
method steps. The pinned XSDs supply the machine-readable structure. The
repository contains semantic XML examples but no original draw.io source, so
some visual glyph choices in the `.drawio` files are explicitly provisional.
The Goal parallelogram and Quality Goal cloud use styles recovered from the
existing diagrams.net-backed figure sources.

## Structural validation already performed

Both semantic model files pass `xmllint` validation against the pinned XSDs.
The repository/thesis XPath subset checks for association and decomposition
targets, the unique ERD root check, and the DAO-ML federation/hierarchy checks
also pass. Both `.drawio` files are well-formed XML. These structural checks do
not establish semantic correctness, notation fidelity, model usefulness, or
empirical validity.

## Important normalization discovered during construction

Currynomics is modeled as one DAO with one Organization Goal,
`OG-CURRYNOMICS`. The four TEDM goals are ordinary refinements `G-CG1` through
`G-CG4`. Earlier provisional aliases `OG-CG1`–`OG-CG4` incorrectly implied
four DAO/Organization Goal roots and have been replaced in the manuscript and
trace package.

`TK-DAO` is the canonical DAO-token identifier. `TP4` is a locking and voting-
weight policy record, not a token, so the worked model does not use `TK-TP4`.

## Review priorities for Sowelu

1. Replace provisional glyphs with the preferred exact DAOMod visual notation.
2. Confirm whether each authority is best represented as a Role or Committee.
3. Confirm every `associated_to`, `member_of`, and `is_controlled_by` relation;
   the latter must mean assignment/revocation or permission delegation rather
   than ownership or general oversight.
4. Confirm appointment methods, committee sizes, eligibility, multisig signer
   threshold and independence, veto authority, emergency scope and expiry, and
   audit ownership.
5. Confirm the `DM-ER1`/`DM-ER2` retained-authority workflows and the
   `DM-ER3`/`DM-ER4` split.
6. Confirm execution modes, proposal states, token transferability and utility,
   mechanism types, and decomposition parents.
7. Run the repository XPath checks in addition to XSD validation and record the
   validation output as evidence rather than overwriting provisional status.

All labels containing `[P]` are provisional choices; `[G]` denotes an unresolved
approval or assignment gate.
