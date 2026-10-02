# Coverage status rules

The status is assigned to each complete platform-independent requirement, not
to an individual test or contract function.

## E — directly exercised support

Use `E` only when all clauses that fall within the stated contract boundary
are represented in reachable source code and at least one positive and, where
applicable, one negative executable assertion distinguishes the intended
behavior from a plausible failure. `E` does not establish institutional or
legal adequacy.

## P — partial support

Use `P` when at least one material clause is represented and exercised or
inspectable, but another material clause, binding, scope, or evidence object
is absent. The `limitation` field must name the missing part. A passing `GAP:`
test is evidence for `P` when it demonstrates both an implemented fragment and
a material missing safeguard.

## N — no corresponding implementation

Use `N` when the evaluated build has no reachable representation or
enforcement point for the requirement. ABI-name searches alone are not
positive evidence. `N` is an implementation-coverage result; it does not
invalidate the platform-independent design requirement.

## Coding procedure

1. Read the complete requirement in the paper.
2. Identify candidate contract state, functions, guards, events, and tests.
3. Check positive, negative, boundary, and bypass paths.
4. Assign the most conservative status supported by the evidence.
5. Record source and test paths plus the unmet clause.
6. Validate identifier uniqueness and aggregate counts with
   `scripts/verify-manifest.mjs`.

The crosswalk is an auditable authorial interpretation. It is not an
independent institutional assessment or inter-rater agreement result.

