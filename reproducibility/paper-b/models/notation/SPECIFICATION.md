# Proposed institutional visual notation, version 1.1.0

The notation adds explicit institutional symbols linked to the new ontology classes. It does not assert that upstream DAO-ML/ET-DM editors understand the additions. The inherited upstream XML models remain unmodified in vocabulary; `InstitutionalModelViews.xsd` defines the proposed institutional-view syntax.

## Compound node grammar

Every new extension node has a card frame bearing two protruding right-edge tabs and a reserved `IKG` family marker. Its label includes a layer badge O/C/E/S, family code, exact class stereotype, stable instance identifier, requirement identifier, and concrete values or a resolvable field pointer. Color is optional and carries no independent semantics. A bare upstream shape is never assigned a new extension meaning.

The nine markers are `IKG:A` ASSET, `IKG:L` STATE, `IKG:S` SCOPE, `IKG:R` ACTOR, `IKG:T` PLAN, `IKG:P` POLICY, `IKG:G` GATE, `IKG:E` RECORD, and `IKG:M` MONITOR. The mandatory marker, twin-tab frame and stereotype together define the symbol. Original DAO-ML/ET-DM glyphs keep their original meanings; the new reference/adaptation nodes do not redefine those glyphs.

The version 1.0 draft included ambiguous primitive shapes: notably a MONITOR hexagon resembling ET-DM Treasury, and a STATE capsule resembling execution wrappers. Version 1.1 removes standalone geometric family glyphs. The manual comparison inspected the supplied thesis's Tables 4.1–4.3, 4.5–4.6 and 4.8 (printed pp. 63–65, 70, 72 and 76). The comparison scope and original glyph inventory are recorded in `thesis-notation-comparison.csv`. This is a core-notation collision audit, not a universal visual-novelty or usability claim.

## DAO-ML institutional notation

The twelve Organization symbols correspond to OLR1–OLR12 and identify semantic assets, lifecycle, scoped authority, functional responsibilities, collective membership, action vocabulary, jointly scoped permissions, incompatibility/delegation, evidence requirements, governed configuration change, coordination-policy linkage and authority distribution. FunctionalRole and CollectiveBody in these views are explicit references/adaptations to upstream elements, not claims of replacing the original DAO-ML role/committee glyphs.

A permission specification must identify the subject role/body, exact asset or asset class, transition and action. A critical transition must identify accountable principals, its minimum distribution and the absence of sole end-to-end control. A version identifier is not a lifecycle state; a lifecycle state is not a decision result.

## ET-DM institutional notation

Coordination symbols correspond to CR1–CR6; Execution symbols correspond to ER1–ER6. A plan lists all elementary steps, exact versions, expected source/target states and evidence. Coordination specifies admission, participation, mechanism, quorum, threshold, timing, delegation, outcomes and challenges. Authorization identifies the accepted decision, complete plan, executor, expiry and nonce. Receipts identify attempts, result manifests, status and failures. Technical confirmation has a receipt and idempotence key. Institutional safeguards remain separately identifiable as S-badged symbols for SG1–SG12; a technical result does not silently become an institutional or legal approval.

## Connection rules

- Directed extension edges use tandem arrowheads and a mandatory `IKG:` label. Solid ontology-relation edges use the exact declared property name after that prefix and declared domain/range: `hasAsset`, `requiresPolicy`, `hasPlan`, `hasReceipt`, `hasMandate`.
- Dashed directed `IKG:baseRef` edges resolve to upstream model element IDs and mean traceability, not OWL relationships.
- Dotted requirement edges identify requirement mappings, not execution order.
- Dashed directed `IKG:field:<key>` edges represent actual references in worked record values; they do not invent undeclared ontology properties.
- `IKG:next [guard]` edges belong to a separate illustrative process trace. They are not ontology relations, a proof of atomicity or evidence of deployed execution.

A field-reference or property edge never implies a vote result, verified identity, valid legal mandate or satisfied safeguard. Compound restoration shows two version changes under a complete plan and common commit; it is not depicted as in-place deletion of prior history. Emergency policies display bounded scope, expiry, notification and independent review rather than an unrestricted administrator symbol.

## Validation and status

`validate_notation.py` checks the 36-symbol catalog, exact class/requirement coverage and the exported diagrams' notation metadata and stereotypes. Model and RDF validators separately check values, references, schema compatibility and ontology declarations. These mechanical checks do not establish perceptual clarity, notation usability, semantic completeness or external acceptance. Independent user/modeling evaluation remains required. Appendix A defines the DAO-ML additions, Appendix B defines the ET-DM additions and safeguard interfaces, and Appendix C applies them to WoodHive.
