# Codex Supplemental Research: Illumio Policy Experience

Date: 2026-08-08

Scope: Additive research for the existing PolicyExperience prototype. This document builds on `docs/research/illumio-policy-objects.md` and focuses on product positioning, rule-writing mental models, scope-centric policy UX, guardrails/templates, impact preview, and provisioning.

## Existing Project Context

PolicyExperience already contains a working full-stack product prototype with a V1 explicit source/destination model and a V2 scope-centric model. The V2 design docs define the policy scope as the implicit identity:

- Ingress: scope is the destination, entity is the source.
- Egress: scope is the source, entity is the destination.

This maps well to Illumio's own ruleset concept: rules live inside a scope, and labels define the workloads or resources affected by that scope.

Local docs read:

- `README.md`
- `client/.claude/CLAUDE.md`
- `docs/research/illumio-policy-objects.md`
- `docs/superpowers/specs/2026-08-04-policy-v2-scope-centric-design.md`
- `docs/superpowers/specs/2026-08-07-policy-v2-ux-enhancements-design.md`

## Illumio Product Positioning

Illumio positions itself around breach containment, Zero Trust Segmentation, visibility, risk reduction, policy, and preventing lateral movement across hybrid and multi-cloud environments. Current Illumio marketing language emphasizes seeing risk, setting policy, and stopping lateral movement, with an "assume breach" Zero Trust framing.

PolicyExperience implication:

- Use language that emphasizes containment and least-privilege access, not generic firewall administration.
- Explain policy creation as a way to define necessary communication and reduce lateral movement.
- Use "impact", "scope", "enforcement points", "provisioning", and "risk" as first-class nouns in the product.

Sources:

- https://www.illumio.com/illumio-segmentation
- https://www.illumio.com/solutions/zero-trust
- https://www.illumio.com/company/about-illumio
- https://www.illumio.com/illumio-platform

## Policy Model

Illumio Core uses a label-based allowlist model. Rules define allowed communications between workloads or between workloads and other entities such as IP lists, virtual servers, and the internet. Illumio documentation describes a rule's fundamental structure as provider + service + consumer.

Illumio's labels are functional identity, not just display metadata. The classic dimensions are:

- Role
- Application
- Environment
- Location

Illumio documentation says labels are used in ruleset scopes and in providers/consumers. The PCE turns label-based policy into host firewall rules.

PolicyExperience implication:

- The rule composer should remain relationship-oriented: "Allow/Deny this other side to talk to this scoped identity over these services."
- Labels should be visually grouped by dimension where possible.
- Rules should not feel like low-level IP ACL rows unless the user intentionally selects IP lists.
- The V2 "scope is me" model is justified by Illumio's ruleset-scope model.

Sources:

- https://product-docs-repo.illumio.com/Tech-Docs/Core/23.2/Security-Policy/out/en/security-policy/overview-of-security-policy/the-illumio-policy-model.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/23.5/Security-Policy/out/en/security-policy/security-policy-objects/labels-and-label-groups.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/24.5/Security-Policy/out/en/security-policy/illumio-policy-enforcement-model.html

## Policy Objects

The existing `illumio-policy-objects.md` document already covers the object inventory. The important additive UX framing is:

- Policy objects are reusable handles that make policy maintainable.
- Services, IP lists, label groups, virtual services, and rulesets are provisionable.
- Labels and some bindings can take effect immediately and should be treated differently from provisioned draft objects.
- Segmentation templates are not just examples; they are a product pattern for packaging known-good policy.

PolicyExperience implication:

- Guardrail templates should be modeled as reusable policy objects with source metadata: Illumio Suggested, User Created, Converted from Policy.
- Policy object creation should be available from rule-writing context when the user discovers a missing service/IP list/template.
- Provisioning preview should show dependent objects, not only rules, when the prototype supports that depth.

Sources:

- https://product-docs-repo.illumio.com/Tech-Docs/Core/24.2/Getting%2BStarted/out/en/policy-overview/policy-objects.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/22.5/Security-Policy/out/en/security-policy/overview-of-security-policy/types-of-illumio-policy.html

## Rule Writing Model

Illumio rule writing centers on:

- Consumers / sources: labels, label groups, IP lists, workloads, user groups, or all workloads.
- Providers / destinations: labels, label groups, IP lists, workloads, virtual services, or all workloads.
- Ingress services: service objects, inline port/protocol/process values, or all services.
- Advanced options for objects such as policy exceptions, IP lists, individual workloads, user groups, and virtual services.

Illumio docs also emphasize valid combinations between sources and destinations. A rule authoring UI should therefore guide valid combinations instead of exposing every object as one undifferentiated list.

PolicyExperience implication:

- Preserve the V2 split between direction and entity. It reduces repeated source/destination work and fits scoped policy authoring.
- In rule rows, show direction first, then entity, then services, then action/precedence.
- Keep "All Workloads" and "All Services" visible but visually risky; require clear review before provisioning broad selections.
- Suggested rules should use observed communication patterns, but users should still explicitly approve scope/entity/service/action.

Sources:

- https://product-docs-repo.illumio.com/Tech-Docs/Core/23.5/REST-APIs/out/en/rest-apis/rulesets-and-rules/rules.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/23.5/Security-Policy/out/en/security-policy/create-security-policy/rule-writing.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/24.2/REST-APIs/out/en/rest-apis/rulesets-and-rules/rules.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/24.2/Security-Policy/out/en/security-policy-guide-24-2-10/create-security-policy/rule-writing.html

## Scope, Intra-Scope, And Extra-Scope

Rulesets use scope as the boundary for rules. Illumio docs describe ruleset scope as labels such as Application, Environment, and Location, plus custom labels where configured. Intra-scope rules allow communication within a scope. Extra-scope rules allow communication beyond that scope. Several docs note that intra-scope labels must match the scope for both sides.

PolicyExperience implication:

- V2's scope-centric UI should present scope selection as the highest-order decision.
- Rule validation should be direction-aware:
  - Ingress: entity is outside or inside scope depending on the rule intent.
  - Egress: entity is the destination outside or inside scope.
- Extra-scope and guardrail rules should have validation and warnings when the entity or enforcement point is broader than intended.
- "All | All | All" or equivalent broad scope should require an explicit warning state.

Sources:

- https://product-docs-repo.illumio.com/Tech-Docs/Core/23.5/Security-Policy/out/en/create-security-policy/rulesets.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/25.2/Security-Policy/out/en/security-policy-guide-25-2-10/create-security-policy/rules.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/24.2/Getting%2BStarted/out/en/policy-overview/how-to-create-policy.html

## Provisioning And Versions

Illumio provisioning recalculates changes to policy items such as rulesets, policies, IP lists, services, label groups, and security settings, then transmits them to managed workloads. Draft/active state is central: draft items have not been provisioned, active items are provisioned and enabled. Current docs also describe pending provisioning and reverting changes before provisioning. Provisioned change sets receive version numbers.

PolicyExperience implication:

- Keep draft/pending/provisioned status prominent in list and detail views.
- Provision preview should group changes by type: added rules, removed rules, modified rules, dependent object changes.
- "No changes to provision" is a legitimate end state and should be represented plainly.
- Version or snapshot language matters if the prototype evolves beyond a simple draft/provisioned toggle.

Sources:

- https://product-docs-repo.illumio.com/Tech-Docs/Core/23.2/Security-Policy/out/en/security-policy/create-security-policy/provisioning.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/25.2/Security-Policy/out/en/security-policy-guide-25-2-10/about-provisioning.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/26.1/Security-Policy/out/en/illumio-security-policy-guide-26-x--saas-/about-provisioning/provision-changes.html
- https://product-docs-repo.illumio.com/Tech-Docs/Core/26.1/Admin/out/en/illumio-core-pce-cli-tool-guide-1-4-2/cli-tool-commands-for-resources/list-draft-or-active-version-of-rulesets.html

## Cloud And Application Policy

Illumio Segmentation for the Cloud uses labels, services, IP lists, and applications to write security policy. The cloud policy model distinguishes Organization and Application policies. Application policies define what can talk to applications and are important for limiting lateral movement.

PolicyExperience implication:

- Product copy should distinguish broad organization/guardrail controls from application-owner policy workflows.
- App-owner UX should default toward application-scoped policies, templates, and safer service suggestions.
- Guardrail policies should feel like "template + enforcement points" rather than ordinary copied rules.

Sources:

- https://product-docs-repo.illumio.com/Tech-Docs/CloudSecure/out/en/policy/policy-model.html
- https://product-docs-repo.illumio.com/Tech-Docs/CloudSecure/out/en/policy/about-the-policy-model.html
- https://product-docs-repo.illumio.com/Tech-Docs/CloudSecure/out/en/policy/policy-attributes.html
- https://product-docs-repo.illumio.com/Tech-Docs/CloudSecure/out/en/policy/unified-policy.html
- https://product-docs-repo.illumio.com/Tech-Docs/Integrations/out/en/policy/organization-policy-versus-application-policy/writing-application-policy.html

## Containers And Kubernetes

Illumio Segmentation for Containers extends segmentation to Kubernetes and OpenShift. Docs describe container workload profiles, Kubernetes label mapping, namespace/pod/service annotations, and rules for Kubernetes/OpenShift clusters. Kubernetes services can be represented as Illumio Core Virtual Service objects, and label mapping can assign Illumio labels from Kubernetes labels.

PolicyExperience implication:

- V2's Kubernetes scope path should keep cluster selection required, with namespace and workload labels optional where the design spec says so.
- Label mapping should be treated as a bridge between Kubernetes identity and Illumio policy identity.
- Direction-specific rules are a strong fit for Kubernetes:
  - Ingress to scoped workload/namespace/cluster.
  - Egress from scoped workload/namespace/cluster to DNS, API, FQDN, IP list, or service.
- Guardrail policies are especially useful for repeated cross-cluster rules such as DNS egress, ingress-controller baseline, monitoring scrape, and platform namespace access.

Sources:

- https://product-docs-repo.illumio.com/Tech-Docs/Core/25.2/Install-Upgrade-Admin/out/en/kubernetes-and-openshift/overview-of-containers/introduction-to-illumio-segmentation-for-containers.html
- https://product-docs-repo.illumio.com/Tech-Docs/Containers/out/en/kubernetes-and-openshift/configure-labels-for-namespaces%2C-pods%2C-and-services/use-container-workload-profiles.html
- https://product-docs-repo.illumio.com/Tech-Docs/Containers/out/en/kubernetes-and-openshift/deployment-with-helm-chart--core-for-kubernetes-3-0-0-and-later-/map-kubernetes-node-or-workload-labels-to-illumio-labels.html
- https://product-docs-repo.illumio.com/Tech-Docs/Containers/out/en/kubernetes-and-openshift/deployment-with-helm-chart--core-for-kubernetes-3-0-0-and-later-/map-kubernetes-node-labels-to-illumio-labels.html
- https://product-docs-repo.illumio.com/Tech-Docs/Containers/out/en/illumio-segmentation-for-containers/configure-security-policies-for-containerized-environments/rules-for-kubernetes-or-openshift-clusters.html
- https://product-docs-repo.illumio.com/Tech-Docs/Containers/out/en/kubernetes-and-openshift/configure-security-policies-for-containerized-environments/rules-for-containerized-applications.html

## UX Implications For PolicyExperience

### Product Navigation

- Keep V1 and V2 clearly separated while V2 is exploratory.
- Use "Policy-v2" or a clearer product name only until the concept stabilizes.
- In V2, list pages should support tabs for Policies and Templates because guardrail templates are reusable objects, not secondary details.

### Policy Creation

- Make scope/enforcement points the first meaningful decision.
- Full-page create flow is better than a dialog for V2 because it must collect policy identity, scope, ingress rules, egress rules, and template mode.
- Show a persistent create footer with validation and one final "Create Policy" action.

### Rule Authoring

- Ingress/egress language should be explicit:
  - Ingress: "Who can talk to this scope?"
  - Egress: "What can this scope talk to?"
- A rule row should read as a sentence:
  - Ingress: "Allow [entity] to reach this scope over [services]."
  - Egress: "Allow this scope to reach [entity] over [services]."
- Put action precedence controls close to the action token. Use filter controls for All, Allow, Deny, Override Deny.

### Guardrails And Templates

- Templates should store rules without scope.
- Guardrail policies should bind a template to enforcement points.
- Template detail should show linked policies so the user understands blast radius before editing.
- Convert-to-template should preserve original policy rules and make the "live-linked" result clear.

### Provisioning And Impact Preview

- Provision preview should show operational consequences before commit.
- Impact should include affected scopes/enforcement points, rule additions/modifications/removals, and dependent objects.
- Broad choices such as all workloads, all services, or 0.0.0.0/0 should be highlighted as review notes.

### Suggested Policy

- "Illumio Suggested" should mean recommended baseline templates or suggested rules from observed traffic.
- Suggested templates need visible provenance and confidence or rationale.
- Suggested rules should never auto-provision; require explicit user acceptance.

## Open Product Questions

- Should V2 support RAEL label scope directly, or should Kubernetes scope remain the first working path?
- Should guardrail templates support deny/override deny by default, or should suggested templates start allow-only?
- Should "All Services" be allowed in templates, or gated behind an admin-only confirmation?
- Should impact preview simulate workload counts from seed data or remain a qualitative review in the prototype?
- Should provisioning version history be modeled now or deferred until diff quality improves?
