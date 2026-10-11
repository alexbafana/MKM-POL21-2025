# TEDM replication package

For *Concentration-Aware Token Economy Design for DAO Engineering: Linking Goals, Risks, and Engineering Requirements*. This is separate from ../paper-b, whose contract tests evaluate institutional knowledge-graph governance.

## Reproduce the automated audit

Requires Python 3 and xmllint (libxml2); no Python third-party dependencies.

```sh
python3 reproducibility/tedm/scripts/prepare_records.py
python3 reproducibility/tedm/scripts/validate.py
```

The first script serializes supplied Tables S1-S6 into 32 proposed records and 159 explicit documentary links. Monitoring populations/data requirements are prospective derivations from the source measure and baseline, not observed data. Grouped authority records retain unresolved atomic assignments. The original schema's single-dimension field is serialized using pipe-delimited dimension sets; this adapter is documented rather than claimed to conform to every original normalization rule.

The second script checks XML parsing, both pinned XSDs, duplicate record IDs, link and mapping sources, and candidate destination IDs. It reports profile gaps separately from structural errors. It does not implement the thesis's full XPath suite or assess semantic correctness, complete field-level schema conformance, behavioral effectiveness, or practitioner usability. Exit zero means only the implemented structural checks passed; inspect profile_complete separately.

## Results and remaining work

See results/automated-audit.json and protocol/HUMAN-HANDOFF.md. No independent study or reconstruction has been completed. The candidate mapping QG-IN2-PARTICIPATION is absent from the supplied model. Five grouped authority records need atomic right-level decisions. The models are provisional; layout and semantic review remain distinct.

models/ contains editable diagrams and semantic XML; schemas/ pins the published XSDs; traceability/ contains records, provenance and candidate mappings; source/ preserves the supplied documentary tables; protocol/ contains tasks, rubrics, and blank evidence forms.

Cite a reviewed fixed commit or release. Repository-root citation metadata refers to the other paper. Original third-party artifacts retain their provenance and applicable rights. Publishing this package does not establish independent validation.

## Ready-to-run study kit

Start with protocol/RUN-STUDY.md. Candidate authority assignments and the one model correction proposal are prefilled for expert decisions. Four method/case ZIPs and one independent-reconstruction ZIP are generated under results/packets/. Only distribute the assigned ZIP; assessor reference answers and author model files are deliberately excluded. The constructed cases are artificial exercises requiring pilot confirmation, not operating DAO observations.

```sh
python3 reproducibility/tedm/scripts/build_packets.py
python3 reproducibility/tedm/scripts/summarize_human_results.py
```

The human evidence summary currently records zero submissions and keeps all study components pending. New endpoint checks resolve model relations but do not replace full XPath semantics or expert review.
