# Institutional DAOMod specialization: WoodHive worked models

This package specifies the paper's institutional knowledge-graph lifecycle specialization as an editable ontology extension, linked DAO-ML and ET-DM XML models, and a structured worked instance. It is a proposed research extension, not an official DAOMod release. The running case models employment events extracted from Estonian news, associated with EMTAK classifications and provenance. WoodHive, participants, mandates, evidence digests and policy parameters are illustrative; no institutional endorsement or production deployment is implied.

## Reviewer entry points

- `DAOMod_Institutional_Integrated.rdf`: self-contained integrated ontology containing the unchanged upstream definition graph plus all institutional additions. It embeds the original definitions rather than depending on an import. It is a new research version; the original snapshot remains untouched.
- `Institutional_DAOMod.rdf`: editable OWL/RDF extension. Imports the local upstream snapshot; adds 36 named institutional design concepts, selected verified upstream subclass links, and plan/asset, authorization/plan and confirmation/receipt relations. Existential OWL restrictions express semantic requirements under open-world semantics. Missing fields are checked separately by the closed-world validator. No OWL reasoner consistency or conservative-extension proof is claimed.
- `schemas/DAOMod_Ontology.rdf`: original upstream ontology, unchanged. The source uses both 2024/4 and 2024/5 ontology IRIs; the extension uses class IRIs actually declared by that source.
- `WoodHive_DAO-ML.model.xml`: upstream-compatible organization with seven functional roles, publication and independent-review committees, governance area and eight distinct permissions.
- `WoodHive_ET-DM.model.xml`: upstream-compatible Extended Requirement Diagram with decision policy, publication/restoration/configuration proposals, admission/voting/execution/challenge mechanisms, authorization/confirmation transactions, stores and adapter goals. XML transaction names specify design operations; this package does not generate deployed contracts.
- `institutional-profile.json`: extension definitions, upstream model-element links, inherited/adapted/extended treatment and worked-case field pointers.
- `WoodHive.institutional.json`: structured instance linking versioned assets, permissions, mandates, evidence, proposal, decision, authorization, binding, receipt, confirmation, restoration and safeguards.
- `requirements.csv`: all OLR1–OLR12, CR1–CR6, ER1–ER6 and SG1–SG12, with requirement wording extracted from the revised paper and resolvable forward/backward model bindings.
- `worked-traces.json`: success, rejection, challenge/suspension, expiry, missing-receipt, compound restoration and exceptional-suspension design traces. These are synthetic worked examples, not empirical outcomes.
- `diagrams/`: editable diagrams.net `.drawio` pages and matching SVG overview diagrams. Detailed element semantics and worked values are in the linked model sources.
- `results/validation.json`: generated checks, negative fixtures, scope limits and SHA-256 file manifest.

## Proposed visual notation

`notation/SPECIFICATION.md` defines nine reserved IKG marker families, paired-tab extension frames, exact class
stereotypes, layer badges and distinct edge semantics. `notation/notation.json`
maps all 36 classes. The editable legend and regenerated worked diagrams use
this notation. It is proposed notation, not an upstream editor integration.
`validate_notation.py` checks catalog and diagram bindings; it does not assess
usability or graphical-language adequacy. Version 1.1.0 removes collision-prone
primitive glyphs after visual comparison with the thesis core notation tables;
see `notation/thesis-notation-comparison.csv`. The manuscript's Appendices A–C
separate DAO-ML notation, ET-DM notation and worked WoodHive applications.

## Explicit institutional model types and modeling walkthrough

`extended-views/WALKTHROUGH.md` shows how to construct the Organization,
Coordination, Execution and Safeguard views using the actual new ontology
classes. Each view has editable XML and diagrams.net/SVG diagrams. Across the
four views, 36 explicit concept instances carry concrete worked values,
requirement IDs, upstream element links and instance field pointers. Five
ontology-property links connect the views. Their new institutional-view syntax
is defined by `schemas/InstitutionalModelViews.xsd`; it is not claimed to be
accepted by the original DAO-ML or ET-DM editors.

With the pinned RDF dependencies installed, run:

```sh
python reproducibility/paper-b/models/scripts/validate_views.py
```

`results/extended-view-validation.json` records four schema-valid views,
36 concrete ontology bindings, five domain/range-checked links and six rejected
invalid variants. The walkthrough separates automated consistency from
independent modeling evaluation and runtime governance assurance.

## Integrated ontology validation

`DAOMod_Institutional_Integrated.rdf` contains 3,162 RDF triples, including all
3,017 original triples. The original ontology declaration is retained; the
integrated research version has its own version identifier. Its institutional
class IRIs stay identical to the modular extension, so the requirement mapping
applies to both forms. Removing the modular import/header does not remove its
class or property axioms. The integrated graph requires no imports.

Additional validator dependencies are pinned in `scripts/ontology-requirements.txt`:

```sh
python3 -m venv /tmp/paper-b-ontology
/tmp/paper-b-ontology/bin/pip install -r reproducibility/paper-b/models/scripts/ontology-requirements.txt
/tmp/paper-b-ontology/bin/python reproducibility/paper-b/models/scripts/validate_integrated.py
```

`results/integrated-validation.json` records RDF parsing, exact graph-union
isomorphism (including blank-node axioms), unchanged original checksum, 36
institutional class/requirement links, five property declarations, three
institutional existential restrictions, upstream subclass references and an
RDF/XML round trip. Three altered graphs are rejected. These checks do not
establish OWL-DL consistency, class satisfiability or conservative extension.
The upstream graph is preserved even where it uses legacy namespace variants.

To rebuild the integrated file from the unchanged original and modular extension:

```sh
python3 reproducibility/paper-b/models/scripts/build_integrated.py
```

## Institutional additions and worked flow

The base DAO-ML file retains the upstream role/committee/permission structures. Joint asset/transition permission scopes, immutable version references, institutional mandate validity, distribution and duty constraints are carried in the linked extension instance. The base ET-DM file retains decision, proposal, mechanism, transaction and data-store constructs. Exact plans, binding, receipt manifests, separate execution statuses, and institutional checks are carried in the extension. This explicit linked profile avoids silently changing the upstream XML vocabulary or asserting that free-text parameters alone enforce the new requirements.

The worked publication binds `Plan-Publish-v1` and `Evidence-v1` to `Decision-1`, `Authorization-1`, `Binding-1`, `Receipt-1` and `Confirmation-1`. The graph's `validated → published` transition is separate from accepted decision and authorized/pending/confirmed execution statuses. The illustrative committee requires two independent principals, unanimous approval, 30 voting blocks and a 5-block execution delay. These values are example choices, not empirical settings or a universal institutional policy. No token economy is assumed: institutional permissions and mandates determine eligibility.

The restoration example requires a fresh authorization for a two-step plan: reactivate retained v1 and supersede v2 through a common commit. It preserves history. The validator checks the plan structure; this package does not implement a transactional RDF store or prove atomic distributed execution. Emergency authority is limited to suspension, expires after ten blocks and requires notification and independent review. The illustrative compliance reference does not establish legal adequacy. Protected evidence stays off-chain, with retention and preservation-hold metadata.

## Reproduce model validation

Requirements: Python 3.9+ standard library and `xmllint` (libxml2). No Python packages or network access are needed.

```sh
python3 reproducibility/paper-b/models/scripts/validate.py
```

Checks validate both XML models against the unmodified upstream XSD snapshots, resolve referenced IDs, check 36 requirement/model/instance bindings, inspect upstream ontology class links, check the worked publication and restoration specification, and reject 17 deliberately invalid fixture variants. `results/validation.json` is regenerated. Schema validation is distinct from complete model-language semantics; fixture rejection is distinct from deployed contract enforcement.

These results do not change the paper's baseline E/P/N classifications or Solidity coverage. Independent modeling review, independent replication, ontology reasoning, RDF canonicalization conformance, live institutional participation, legal review and production deployment remain uncompleted. The synthetic digest is not a cryptographic measurement of a real graph. All thresholds and mandates require deployment-specific review.

## Upstream provenance

Original ontology and schema snapshots are from `SoweluAvanzo/DAOMod`, commit `9ce3fc44dbb20d6441539f5992929746778bcbcc`. See `schemas/PROVENANCE.md` and `schemas/upstream-manifest.json`. Original upstream ownership and licensing apply. The repository snapshots are not asserted to be byte-identical to the PhD submission files. The original repository also contains CH, Circles and WR Organization/Requirement Diagram examples; this package's WoodHive files are new worked models.
