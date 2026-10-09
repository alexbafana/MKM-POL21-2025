# TEDM external traceability package

Article: *Concentration-Aware Token Economy Design for DAO Engineering:
Linking Goals, Risks, and Engineering Requirements*

Journal: *Electronic Markets*

Authors: Alex Norta; Luca Pennella; Sowelu Avanzo; Samela Kivilo; Marie
Hattingh. Corresponding author: Alex Norta, Tallinn University, Estonia;
University of Pretoria, South Africa; Norta DeSyCo OÜ, Estonia
(alex.norta.phd@ieee.org).

This directory contains the normalized CSV schema and serialization templates
defined in Supplementary Table S13. The package is normative only for the
proposed TEDM handoff profile.

- `manifest.csv` fixes the package and target-schema versions.
- `records.csv` and `links.csv` are generated documentary serializations; `changes.csv` remains a change-log template. See record-provenance.csv and the package README for adapter limitations.
- `destinations.csv` contains the candidate identifier dispositions reported in
  Supplementary Table S12. The companion first-draft DAO-ML and ERD files are in
  `../model-drafts/`; their semantic XML passes structural checks, but native
  aliases and validation-evidence fields remain provisional until expert review
  confirms the assignments, notation, and semantics.
- `schema.csv` is the machine-readable data dictionary.

The current package status is `review`, not `approved`. Structural CSV
conformance would not establish model validity, semantic losslessness,
practitioner usability, implementation correctness, or safeguard effectiveness.
