# Illumio Workloads & Policy Impact — Research Reference

Date: 2026-08-09

Scope: Comprehensive research on Illumio workload concepts, lifecycle, labeling, ingestion, and policy impact analysis. This document supports the design and implementation of a Workloads product area and Show Impact workflows in PolicyExperience.

Builds on: `illumio-policy-objects.md`, `codex-illumio-policy-experience-research.md`

---

## 1. What Is a Workload?

In Illumio, a **workload** is any computing entity whose network communications can be monitored and/or controlled by Illumio policy. Workloads are the fundamental unit of segmentation — policy rules ultimately resolve to allowed or denied traffic between workloads.

**Workload types:**

| Type | Examples | Agent | How Registered |
|------|----------|-------|----------------|
| Server (VM / bare metal) | Windows Server, Linux VM, physical host | VEN (Virtual Enforcement Node) | Pairing with activation code |
| Container / Pod | Kubernetes pod, OpenShift pod | Kubelink / C-VEN | Automatic via K8s integration |
| Cloud instance | AWS EC2, Azure VM, GCP Compute | VEN or cloud connector | Cloud connector sync or VEN pairing |
| Unmanaged workload | Third-party device, legacy system, partner network | None | Manual creation or API import |

**Key distinction:** Illumio treats workloads as the identity layer for segmentation, not IPs or subnets. A workload has labels that define its functional identity, and policy is written against those labels — not against network addresses. The PCE (Policy Compute Engine) resolves label-based policy into IP-level firewall rules for each workload.

---

## 2. Managed vs Unmanaged Workloads

### Managed Workloads

A **managed workload** has a VEN (Virtual Enforcement Node) agent installed and paired with the PCE. The VEN:

- Reports the workload's IP addresses, interfaces, and open ports to the PCE
- Receives computed firewall rules from the PCE and programs them into the host firewall (iptables/nftables on Linux, WFP on Windows)
- Reports real-time traffic flow data (used in Illumination)
- Sends heartbeat/health status periodically

**Managed workload states:**
- **Online:** VEN is connected and reporting
- **Offline:** VEN has not reported within the heartbeat timeout
- **Suspended:** VEN is intentionally paused (maintenance)

### Unmanaged Workloads

An **unmanaged workload** has no VEN agent. It is registered in the PCE to participate in policy as a known entity, but Illumio cannot:
- Enforce firewall rules on it directly
- Collect traffic flow data from it
- Monitor its online/offline status

Unmanaged workloads are used for:
- Representing external partners, legacy devices, or unsupported OS
- Including known external IPs in label-based policy without deploying an agent
- Modeling infrastructure devices (load balancers, firewalls, IoT) in the policy map

Unmanaged workloads are identified by their IP address(es) and can have labels applied for use in rules.

---

## 3. VEN (Virtual Enforcement Node)

The VEN is Illumio's lightweight agent installed on managed workloads. It is the enforcement point for micro-segmentation.

### Pairing

**Pairing** is the process of registering a workload with the PCE by installing and activating the VEN.

1. **Admin creates a pairing profile** in the PCE specifying: default labels, enforcement mode, visibility level, allowed uses count, and expiration
2. **Pairing profile generates an activation code** (pairing key)
3. **VEN is installed** on the target workload (package install or script)
4. **VEN presents the activation code** to the PCE on first startup
5. **PCE validates** the code and registers the workload with the configured defaults

**Pairing profiles** configure:
- Labels to auto-assign (RAEL dimensions)
- Initial enforcement mode (Idle, Visibility Only, Selective, Full)
- Visibility level (flow summary vs enhanced data collection)
- Key lifespan and maximum activations
- Allowed OS types

### VEN Properties

| Property | Description |
|----------|-------------|
| `ven_version` | Installed VEN software version (e.g., `23.5.10`) |
| `status` | `active`, `suspended`, `stopped`, `uninstalled` |
| `last_heartbeat_at` | Timestamp of most recent heartbeat |
| `activation_type` | `pairing_key`, `kerberos`, `pce_api` |
| `conditions` | Array of issues/warnings (e.g., `agent.missing_heartbeats_after_upgrade`) |

### VEN Compatibility

Illumio publishes a VEN compatibility matrix. VENs must be at a version compatible with the PCE version. Illumio generally supports N-2 VEN versions with the current PCE.

---

## 4. Workload Lifecycle & Enforcement States

### Enforcement Modes

Enforcement mode determines how aggressively the VEN applies firewall rules:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Idle** | VEN installed but takes no action. No flow reporting, no enforcement. | Pre-deployment testing |
| **Visibility Only** | VEN reports traffic flows to PCE but does NOT enforce any rules. All traffic is allowed. | Discovery phase — see what talks to what before writing policy |
| **Selective Enforcement** | VEN enforces only rules that explicitly reference this workload. Other traffic is allowed. | Incremental rollout — enforce critical rules first |
| **Full Enforcement** | VEN enforces all computed rules. Traffic not explicitly allowed is denied (allowlist model). | Production segmentation — Zero Trust enforcement |

### Enforcement Lifecycle

The typical deployment progression:

```
Install VEN → Idle → Visibility Only → (observe traffic in Illumination) →
  → Write policy → Selective Enforcement → (validate) →
  → Full Enforcement
```

This progressive model lets security teams:
1. Discover existing traffic patterns without breaking anything
2. Write policy based on observed reality
3. Test enforcement incrementally
4. Move to full Zero Trust with confidence

### Online/Offline Detection

- VEN sends periodic heartbeats to the PCE
- If heartbeats stop for a configurable period, workload transitions to "offline"
- Offline workloads retain their last-known firewall rules (fail-closed)
- When VEN reconnects, it re-syncs policy from the PCE

---

## 5. Workload Attributes

Based on Illumio's REST API and documentation, a workload object contains:

### Core Identity

| Field | Type | Description |
|-------|------|-------------|
| `href` | string | API URI (e.g., `/orgs/1/workloads/abc-123`) |
| `name` | string | Display name (optional, may be hostname) |
| `hostname` | string | OS-reported hostname |
| `description` | string | User-provided description |
| `managed` | boolean | Whether a VEN is installed |
| `created_at` | datetime | Registration timestamp |
| `updated_at` | datetime | Last modification timestamp |
| `deleted` | boolean | Soft-delete flag |

### Network

| Field | Type | Description |
|-------|------|-------------|
| `public_ip` | string | Public/NAT IP address |
| `interfaces` | array | Network interfaces with name, address, CIDR block, default gateway |
| `online` | boolean | Whether VEN is currently reporting |

### Platform / OS

| Field | Type | Description |
|-------|------|-------------|
| `os_id` | string | OS identifier (e.g., `ubuntu-22.04`) |
| `os_detail` | string | Detailed OS version string |
| `os_type` | string | `windows`, `linux` |
| `service_provider` | string | Cloud provider if applicable (`aws`, `azure`, `gcp`) |
| `data_center` | string | Data center or cloud region |
| `data_center_zone` | string | Availability zone |

### Agent / VEN

| Field | Type | Description |
|-------|------|-------------|
| `agent.status` | string | `active`, `suspended`, `stopped` |
| `agent.config.mode` | string | Enforcement mode: `idle`, `visibility_only`, `selective`, `full` |
| `agent.config.visibility_level` | string | `flow_summary`, `flow_drops`, `flow_off`, `enhanced_data_collection` |
| `agent.secure_connect` | object | SecureConnect VPN status |
| `ven.href` | string | VEN object reference |
| `ven.hostname` | string | VEN-reported hostname |
| `ven.name` | string | VEN display name |
| `ven.version` | string | Installed VEN version |
| `ven.status` | string | VEN status |
| `ven.activation_type` | string | How VEN was paired |
| `ven.last_heartbeat_at` | datetime | Last heartbeat |
| `ven.conditions` | array | VEN health conditions |

### Labels

| Field | Type | Description |
|-------|------|-------------|
| `labels` | array | Array of label objects `[{href, key, value}]` |

**Constraint:** One label per dimension (key). A workload can have at most one `role` label, one `app` label, one `env` label, one `loc` label, plus any custom label dimensions (up to 20 total dimensions).

### Kubernetes-Specific

For containerized workloads (managed via Kubelink/C-VEN):

| Field | Type | Description |
|-------|------|-------------|
| `container_cluster` | object | Cluster reference with href, name |
| `namespace` | string | Kubernetes namespace |
| `pod_name` | string | Pod name |
| `service_account` | string | K8s service account |
| `k8s_labels` | object | Raw Kubernetes labels (key-value map) |

---

## 6. Workload Labeling

Labels are the cornerstone of Illumio's identity-based policy model. Every policy rule references labels, not IPs or hostnames.

### Label Dimensions

**Default (RAEL):**
- **R**ole — What the workload does (web, api, db, cache, worker, load-balancer)
- **A**pplication — Which application it belongs to (HRM, ERP, CRM, Payment Processor)
- **E**nvironment — Deployment stage (production, staging, development, test)
- **L**ocation — Physical or logical location (us-east, us-west, eu-west, on-prem)

**Custom dimensions:** Illumio supports up to 20 label dimensions total. Common custom dimensions include:
- `type` — Infrastructure type (server, container, virtual)
- `dept` — Business department (engineering, finance, hr)
- `tier` — Architecture tier (frontend, backend, data, monitoring)
- `compliance` — Regulatory scope (pci, hipaa, sox)

### Label Assignment Methods

| Method | When Used | Volume |
|--------|-----------|--------|
| **Pairing profile** | At VEN installation time | Auto, per profile |
| **Manual (PCE UI)** | Individual workload management | One at a time |
| **Bulk label edit** | Post-deployment label campaigns | Tens to thousands |
| **REST API** | Automation, CMDB sync, CI/CD | Unlimited |
| **K8s label mapping** | Container workloads | Automatic per pod |
| **Container Workload Profiles** | K8s namespace-level defaults | Per namespace |

### One Label Per Dimension

A workload can have exactly one label per dimension. Setting a new label for a dimension replaces the existing one. This constraint ensures policy evaluation is deterministic — there is no ambiguity about which role/app/env/loc a workload belongs to.

### K8s Label Mapping

For Kubernetes workloads, Illumio supports **label mapping** — translating Kubernetes labels (arbitrary key-value pairs) into Illumio label dimensions:

- **Node label mapping:** Map K8s node labels to Illumio labels on all pods running on that node
- **Workload label mapping:** Map K8s pod labels or annotations to Illumio labels
- **Container Workload Profiles (CWP):** Namespace-level profiles that auto-assign Illumio labels to pods in that namespace

Example mapping configuration:
```yaml
# Map K8s label "app.kubernetes.io/name" → Illumio "app" dimension
# Map K8s label "environment" → Illumio "env" dimension
illumio_label_mappings:
  - k8s_label: "app.kubernetes.io/name"
    illumio_dimension: "app"
  - k8s_label: "environment"
    illumio_dimension: "env"
```

---

## 7. Workload Ingestion Sources

Workloads enter the Illumio PCE through several paths:

### VEN Pairing (Primary)

Traditional agent-based onboarding:
1. Create pairing profile with default labels and enforcement config
2. Generate activation code
3. Install VEN on target host + present activation code
4. Workload registers with labels and starts reporting

### Kubernetes / OpenShift Integration

- **Kubelink** (or **C-VEN** / **Illumio Operator**) is deployed as a DaemonSet in each cluster
- Automatically discovers and registers all pods as workloads
- Applies label mapping from K8s labels to Illumio labels
- Manages network policies on each node for pod-level segmentation
- Handles pod lifecycle (creation, scaling, termination) automatically

### Cloud Connector

- **AWS:** Flow log ingestion, EC2 instance discovery
- **Azure:** NSG flow logs, VM discovery, Azure Firewall integration
- **GCP:** VPC flow logs, Compute Engine discovery
- Syncs cloud instance metadata (tags, VPC, subnet, security groups) to workload attributes
- Can auto-assign labels from cloud tags

### API Import

- REST API allows bulk creation of unmanaged workloads
- Used for CMDB sync, IPAM integration, and automation pipelines
- Can set all workload attributes including labels programmatically

---

## 8. Policy Impact Analysis

### How Policy Maps to Workloads

When a user writes a rule like: `Allow [env=prod, role=web] → [env=prod, role=api] over TCP/443`

The PCE resolves this by:
1. **Finding all workloads** matching `env=prod AND role=web` (consumers/sources)
2. **Finding all workloads** matching `env=prod AND role=api` (providers/destinations)
3. **Computing firewall rules** for each workload in both sets
4. **Distributing the rules** to VENs on managed workloads

### Impact Determination

"Impact" means: **which workloads will have their firewall rules changed** when a policy change is provisioned.

**A workload is impacted when:**
- Its labels match the scope of a ruleset being changed
- Its labels match either the consumer or provider side of a rule being added, modified, or deleted
- The rule's service ports affect traffic the workload participates in

### Ruleset Scope Matching

Rulesets have a **scope** defined by labels. A workload falls within a ruleset's scope when its labels match ALL of the scope's labels (AND logic across dimensions, OR within a dimension via label groups).

Example scope: `app=HRM, env=prod`
- Matches: workload with `app=HRM, env=prod, role=web, loc=us-east`
- Does not match: workload with `app=HRM, env=dev, role=web, loc=us-east`
- Does not match: workload with `app=ERP, env=prod, role=web, loc=us-east`

### Explorer

Illumio **Explorer** is a traffic analysis tool that shows:
- Historical traffic flows between workloads
- Which flows would be allowed or blocked under current or proposed policy
- "What if" analysis for policy changes

Explorer helps users understand impact before provisioning by answering: "If I provision these rules, what traffic will be newly allowed or blocked?"

### Illumination Map

The **Illumination Map** is Illumio's visualization of workload communications:
- Shows workloads as nodes and traffic flows as edges
- Color-codes flows: allowed (green), potentially blocked (red), unknown (yellow)
- Helps identify undeclared dependencies before enforcement
- Groups workloads by app, env, or location labels

### Policy Generator

Illumio's **Policy Generator** (also called **Automated Policy Discovery**) suggests rules based on observed traffic:
- Analyzes flow data from Visibility Only mode
- Proposes rules that would allow observed legitimate traffic
- Groups suggestions by application context
- Lets users accept, modify, or reject each suggestion

---

## 9. Show Impact in PolicyExperience Context

### What "Show Impact" Means for Our Prototype

In PolicyExperience, "Show Impact" answers: **"If I provision this policy/rule change, which workloads are affected and how?"**

The feature should support these user questions:
1. **Before creating a rule:** "How many workloads will this rule apply to?"
2. **During rule editing:** "What is the current blast radius of this scope?"
3. **Before provisioning:** "What changes will take effect, and on which workloads?"
4. **Policy-level overview:** "Which workloads are in this policy's scope?"

### Impact Computation (Label Matching)

The core algorithm for PolicyExperience:

```
Given a set of scope labels (e.g., [{key: 'app', value: 'HRM'}, {key: 'env', value: 'prod'}]):

1. Fetch all workloads from the database
2. For each workload, check if ALL scope labels are present in the workload's label array
   - Match means: for every scope label, the workload has a label with the same key AND value
   - AND logic across different dimensions
3. Return the matching workloads as "impacted"
```

For rule-level impact:
- **V1 (source/destination):** Match workloads against source endpoint filters AND destination endpoint filters
- **V2 (entity/direction):** Match workloads against entity filters within the context of the policy scope

### Impact Display Recommendations

Based on Illumio patterns and UX best practices:

| Surface | What to Show | When |
|---------|-------------|------|
| **Rule row inline** | Workload count badge (e.g., "12 workloads") | Always visible |
| **Scope summary** | Total workloads in scope with breakdown by label | Policy detail header |
| **Impact drawer** | Full list of impacted workloads with labels, type, status | On demand (click) |
| **Provision preview** | Before/after diff with workload count changes | Before committing |
| **Workload detail** | "Policies affecting this workload" reverse lookup | Workload detail page |

---

## 10. Existing Data Model Gap Analysis

### Current Schema (`workloads` table)

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT | Workload name |
| `hostname` | TEXT | FQDN |
| `ip` | TEXT | Single IP address |
| `type` | TEXT | `vm` or `k8s_pod` |
| `labels` | TEXT (JSON) | Array of `{key, value}` |
| `cluster_id` | TEXT FK | K8s cluster (nullable) |
| `namespace_id` | TEXT FK | K8s namespace (nullable) |

### Missing for Workloads Feature

| Field | Priority | Why Needed |
|-------|----------|------------|
| `managed` | High | Distinguish managed vs unmanaged |
| `online` | High | Show connectivity status |
| `enforcement_mode` | High | Core lifecycle state |
| `os_type` | Medium | Platform info for display/filtering |
| `os_detail` | Low | Detailed OS version |
| `ven_version` | Medium | Agent version tracking |
| `ven_status` | Medium | Agent health |
| `last_heartbeat_at` | Medium | Connectivity timing |
| `public_ip` | Low | Cloud/NAT scenarios |
| `data_center` | Low | DC grouping |
| `service_provider` | Low | Cloud provider tag |
| `description` | Low | User notes |
| `created_at` | Medium | Audit/sorting |
| `updated_at` | Medium | Freshness indicator |

### Recommended Schema Extension

Add these columns to the existing `workloads` table:

```sql
managed INTEGER NOT NULL DEFAULT 1,
online INTEGER NOT NULL DEFAULT 1,
enforcement_mode TEXT NOT NULL DEFAULT 'visibility_only'
  CHECK (enforcement_mode IN ('idle', 'visibility_only', 'selective', 'full')),
os_type TEXT DEFAULT NULL
  CHECK (os_type IS NULL OR os_type IN ('linux', 'windows')),
os_detail TEXT DEFAULT '',
ven_version TEXT DEFAULT NULL,
ven_status TEXT DEFAULT 'active'
  CHECK (ven_status IN ('active', 'suspended', 'stopped', 'uninstalled')),
last_heartbeat_at TEXT DEFAULT NULL,
public_ip TEXT DEFAULT NULL,
data_center TEXT DEFAULT '',
service_provider TEXT DEFAULT ''
  CHECK (service_provider IN ('', 'aws', 'azure', 'gcp', 'on-prem')),
description TEXT DEFAULT '',
created_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z',
updated_at TEXT NOT NULL DEFAULT '2026-07-28T10:00:00Z'
```

### Current API Gap

| Existing | Missing |
|----------|---------|
| `GET /api/workloads` (basic list with type/namespace filter) | Detail by ID |
| `fetchWorkloads()` in policies.ts (returns id, name, hostname only) | Update labels |
| — | Bulk label update |
| — | Label summary/distribution |
| — | Impact computation endpoint |
| — | Search/filter by label, status, enforcement mode |

---

## 11. Recommendations for PolicyExperience

### Data Model

1. Extend the `workloads` table with managed/online/enforcement fields as shown above
2. Keep labels as JSON array (consistent with existing pattern, simple label matching)
3. Add realistic seed data with mixed enforcement modes, online/offline states, and managed/unmanaged split

### API Design

1. **`GET /api/workloads`** — Enhanced list with filtering by labels, type, managed status, online status, enforcement mode, search by name/hostname. Paginated.
2. **`GET /api/workloads/:id`** — Full workload detail
3. **`PATCH /api/workloads/:id/labels`** — Update labels on a single workload
4. **`POST /api/workloads/bulk-labels`** — Bulk label update for multiple workloads
5. **`GET /api/workloads/label-summary`** — Aggregated label distribution (how many workloads per label value)
6. **`POST /api/impact/compute`** — Given a set of scope labels, return matching workloads with count

### Frontend

1. Add "Workloads" to SideNav between "Objects" and "Audit Log"
2. `/workloads` — List page with search, label/status filters, enforcement mode filter
3. `/workloads/:id` — Detail page with properties, labels, policies referencing this workload
4. Show Impact components:
   - `ImpactPreview` — Inline summary ("12 workloads affected")
   - `ImpactDrawer` — Slide-out panel with full workload list
   - Integrate into policy detail, rule editor, and provision preview

### Testing

1. Unit tests for label matching logic (exact match, partial match, no match, empty scope)
2. API tests for new workload endpoints
3. Component tests for workload list and impact preview
4. E2e tests for workload pages and show impact flow

---

## Sources

### Illumio Product Documentation
- Illumio Core Security Policy Guide — Policy Model
- Illumio Core Security Policy Guide — Labels and Label Groups
- Illumio Core REST API — Workloads
- Illumio Core Administration Guide — VEN Installation and Pairing
- Illumio Core Administration Guide — Enforcement Modes
- Illumio CloudSecure — Policy Model and Cloud Integration
- Illumio Containers — Kubernetes/OpenShift Segmentation

### Illumio Product Materials
- Illumio Platform Overview (illumio.com/illumio-platform)
- Illumio Zero Trust Segmentation (illumio.com/solutions/zero-trust)
- Illumio Segmentation Overview (illumio.com/illumio-segmentation)

### Existing PolicyExperience Research
- `docs/research/illumio-policy-objects.md` — Policy object inventory (labels, services, IP lists, etc.)
- `docs/research/codex-illumio-policy-experience-research.md` — Product positioning, rule writing, scope model, provisioning, K8s
