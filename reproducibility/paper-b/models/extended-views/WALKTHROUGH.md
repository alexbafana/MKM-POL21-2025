# Working with the extended ontology: WoodHive institutional model types

These are proposed institutional views linked to DAO-ML and ET-DM, not replacements for the upstream syntax or an official DAOMod release. Each view uses a new, explicitly identified namespace (`urn:paper-b:institutional-model-view:1.0`) and a supplied XSD. The integrated ontology is the shared concept reference. The ordinary upstream-compatible models remain available.

## 1. Model asset-scoped organization

Open `WoodHive_Organization.xml` and `Organization.drawio`. The twelve explicit ontology elements map to OLR1–OLR12. `SemanticAsset` carries the graph identity and immutable version references; `Lifecycle` carries asset states and transition relations. `ScopedPermission` binds a subject, asset, operation and permission jointly. `AssignmentConstraint`, `PolicyLink` and `DistributionConstraint` add delegation/incompatibility, a Coordination-policy reference, and the minimum independent-principal requirement. These are fields that the original DAO-ML schema does not represent directly.

Every XML node provides its exact ontology class URI, requirement identifier, inherited/adapted base element ID, and JSON field pointer. For example, `WoodHive-ScopedPermission` points to `P-execute` in the ordinary DAO-ML model and `/permissions` in the worked instance. Its concrete value records the employment graph scope and publication operation. It is not an unqualified general permission.

## 2. Model exact collective authorization

Open `WoodHive_Coordination.xml` and `Coordination.drawio`. The six elements map to CR1–CR6. `TransitionPlan` includes exact version, source/target states and evidence. `Admission` carries current mandates; `CoordinationPolicy` includes quorum, threshold, timing and delegation bounds. `ValidationPrerequisite` does not substitute a validation result for a decision. `DecisionOutcome` separates terminal decision outcomes from challenged/suspended process states. `ConfigurationProposal` makes changes to organizational authority governable.

In `relations.json`, the ontology property `hasAsset` connects `WoodHive-TransitionPlan` to `WoodHive-SemanticAsset`; `requiresPolicy` connects that plan to `WoodHive-CoordinationPolicy`. The admitted participants and their committee/role assignments are recorded in the worked instance. Quorum and policy values are illustrative choices.

## 3. Model receipt-bound execution

Open `WoodHive_Execution.xml` and `Execution.drawio`. The six elements map to ER1–ER6. `Authorization` contains the decision and complete plan identifiers, appointed executor, expiry and nonce. `ExecutionStatus` separates pending and failed attempts from technical/institutional confirmation. `ContentIdentity` specifies RDFC-1.0 and SHA-256; the supplied digest is synthetic and does not assert a measured graph hash. `AttemptReceipt` contains the result manifest, status, failure field and common commit. `Confirmation` contains receipt linkage and an idempotence key.

The ontology property `hasPlan` binds `WoodHive-Authorization` to `WoodHive-TransitionPlan`, while `hasReceipt` binds `WoodHive-Confirmation` to `WoodHive-AttemptReceipt`. The examples expose precisely what is missing when an ordinary execution model describes a generic transaction but omits exact version and receipt correspondence.

## 4. Model institutional review and safeguards

Open `WoodHive_Safeguard.xml` and `Safeguard.drawio`. Twelve elements map to SG1–SG12. `Mandate`, `Lineage`, `AuditRecord`, `ForwardRestoration`, `EmergencyPolicy`, `IndependentReview`, `ComplianceProfile`, `ProtectedEvidence`, `ExternalDecision`, `Separation`, `AuthorityMonitor` and `Escalation` make institutional obligations explicit. `hasMandate` links `WoodHive-Admission` to `WoodHive-Mandate`.

Compare `worked-traces.json`: publication succeeds only through the full chain; rejection creates no authorization; a challenge suspends the process; an expired authorization yields failure; a missing receipt triggers escalation. Restoration uses a fresh two-step plan and common commit. Exceptional suspension is bounded and has notification and independent-review records. These traces are design examples, not empirical observations or legal findings.

## 5. Edit consistently and validate

1. Edit the authoritative worked values in `WoodHive.institutional.json` and, for a changed specialization definition, `institutional-profile.json`.
2. Keep the ordinary DAO-ML/ET-DM element identifiers and `requirements.csv` bindings aligned. Changing a class requires an explicit ontology change; class names are not arbitrary drawing labels.
3. Regenerate the concrete XML views and matching editable diagrams: `python3 reproducibility/paper-b/models/scripts/build_views.py`.
4. Run the base-model validator, integrated RDF validator, and `validate_views.py` as described in the model-package README.
5. Inspect the generated diagrams and requirement mappings, then seek independent review of semantic adequacy. Automated checks cannot establish appropriate authority, useful notation, complete requirements satisfaction or legal validity.

The view validator checks all four XSD documents, 36 concrete class/requirement/base-element bindings, exact equality of worked values and five declared ontology-property links. Six deliberately invalid variants are rejected. This evidence shows consistent model construction, not enforcement by an executing DAO.
