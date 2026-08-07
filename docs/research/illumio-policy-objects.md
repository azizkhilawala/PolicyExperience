# Illumio Policy Objects — Research Reference

## Overview

Illumio's PCE organizes security policy around **Policy Objects** — reusable building blocks referenced in rulesets and rules. Most are **provisionable** (draft → active).

---

## 1. Labels

The foundational building block. Metadata tags applied to workloads.

**Default types (RAEL):** Role, Application, Environment, Location
**Custom types:** Up to 20 total. Requires key, display names, icon initial, color.
**Constraints:** One label per type per workload. NOT provisionable (immediate effect).
**Application:** Via pairing profiles, manual assignment, bulk edit, Container Workload Profiles.
**Rule logic:** OR between labels of same type, AND between different types.

---

## 2. Label Groups

Containers aggregating multiple labels of the same type. Example: "Non-Prod" = Dev + QA + Stage.

**Key properties:** name (unique), key (label type), labels (members), sub_groups (nested).
**Critical behavior:** In scopes → cross-communication BLOCKED. In rules → cross-communication ALLOWED.
**Provisionable:** Yes.

---

## 3. Services

Reusable definitions of network services (ports/protocols).

**Two types:**
- **Port-Based (All OS):** port, protocol, port range, protocol-only. Examples: `80 TCP`, `443 TCP`, `1000-2000 TCP`, `GRE`.
- **Windows Process/Service-Based:** port/protocol + process path + service name.

**Also supports:** ICMP (type + code), IGMP (multicast).

**Key fields:** name, description, service_ports[] (port, to_port, proto, icmp_type, icmp_code), windows_services[].
**Provisionable:** Yes.
**Rule usage:** Referenced by href or inline port/protocol in `ingress_services`.

---

## 4. IP Lists

Allowlists of IPs, IP ranges, CIDR blocks, and FQDNs for external entities.

**Key fields:** name, ip_ranges[] (from_ip, to_ip, description, exclusion), fqdns[].
**Note:** `0.0.0.0/0` = all IPs. `0.0.0.0` = single IP (DHCP).
**Provisionable:** Yes.

---

## 5. Virtual Services

Abstractions for labeling individual processes/services on workloads (not the whole workload). Critical for multi-tenant and K8s.

**Key concepts:** Collection of port/protocol tuples, bound to workloads via Service Bindings. Each gets its own RAEL labels independent of host.
**Service Bindings:** NOT provisionable (immediate). Virtual Services themselves ARE provisionable.
**Use cases:** Multi-tenant hosts, K8s services, app migration.

---

## 6. Virtual Servers

Load balancer constructs (VIP + port). For F5 and AVI integration.

**Key properties:** VIP address/port, local IPs, labels, enforcement status.
**Supported:** F5 BIG-IP LTM/AFM, AVI Vantage. SNAT and Auto-map modes.
**Provisionable:** Yes.

---

## 7. User Groups

Active Directory / Entra ID groups for Adaptive User Segmentation (AUS).

**Key properties:** name, SID, description.
**Usage:** As consumers (sources) in rules. Only works with Windows workloads.
**Constraints:** Max 100 displayed. Supports AD and Entra ID.
**Provisionable:** Yes.

---

## 8. Pairing Profiles

Configuration templates for workload pairing (VEN installation).

**Configures:** Labels to apply, enforcement state (Idle/Visibility Only/Selective/Full), visibility level.
**Best practice:** Generic profiles with default labels, update after deployment.

---

## 9. Segmentation Templates

Prepackaged security policies for common apps (AD, Exchange, SharePoint, SQL Server, MongoDB, OpenShift).

**Creates:** Services, rulesets, rules, labels, IP lists automatically.

---

## Provisioning Workflow

**Provisionable:** IP Lists, Rulesets, Rules, Services, Virtual Services, Label Groups, User Groups, Virtual Servers, Enforcement Boundaries.
**Not provisionable:** Labels (immediate), Service Bindings (immediate).
**Flow:** Draft → review in Draft & Versions → selective provision → active. Versioned with restore capability.

---

## Rule Structure

- **Scope** (ruleset level): Labels/Label Groups
- **Consumers** (sources): Labels, Label Groups, IP Lists, Workloads, User Groups, "All Workloads"
- **Providers** (destinations): Labels, Label Groups, IP Lists, Workloads, Virtual Services, "All Workloads"
- **Ingress Services**: Service objects or inline port/protocol, or "All Services"
- **Model:** Allowlist-based (Zero Trust)
