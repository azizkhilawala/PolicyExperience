# CLOUD-18357: Kubernetes Workload Unification — Illumio Label Mapping & Hybrid Flow Enrichment

**Jira:** https://jira.illum.io/browse/CLOUD-18357
**Type:** Epic
**Status:** To Do
**Assignee:** Ganesh Talla
**Reporter:** Nick Sappa
**Created:** 2026-06-24

---

## Objective

Ensure all Kubernetes network flows are fully integrated into the Illumio platform and can participate in every core capability (visibility, grouping, policy discovery, recommendation, and enforcement) by requiring proper Illumio label decoration.

## Background

Currently, K8s traffic collected via CNI-native telemetry (Cilium Hubble, Calico flow logs, etc.) lacks Illumio labels. This prevents Kubernetes workloads from being fully visible and manageable within the Illumio platform.

The goal is to close this gap so that K8s flows are treated identically to Illumio CORE workloads — fully labeled, queryable, and policy-ready.

## Description

Implement a platform-side traffic-decorating pipeline that ingests CNI-native flow telemetry and enriches it with both K8s-native metadata and Illumio labels, making K8s workloads true first-class citizens.

## Key Requirements

- **Mandatory Illumio Label Decoration:** Every K8s flow must carry valid Illumio labels to participate in any core platform capability (visibility, grouping, policy, etc.).
- **Unified Experience & Hybrid Policy Support:** Deliver the same user experience as core workloads, including:
  - Unified visualization of traffic
  - Grouping and segmentation using both K8s and Illumio labels together
  - Hybrid policy creation and enforcement between K8s workloads and Cloud / non-K8s workloads
  - Policy discovery and recommendation across hybrid environments
- **Dual Labeling + Rich Metadata:**
  - Preserve both Kubernetes-native labels and mapped Illumio labels
  - Expose K8s metadata as first-class, queryable fields: Namespace, Cluster, Deployment, Pod, Service, Environment (Prod/Test), etc.
- **Cross-Environment Flow Completeness:** Ensure K8s <-> Non-K8s and K8s <-> Cloud flows are fully decorated on both sides for consistent visualization, grouping, and policy enforcement

## Exit Criteria

- 100% of K8s flows arriving at the platform carry complete Illumio labels
- Customers can visualize, group, and create policies (e.g., K8s workload on one side, Cloud workload on the other) using unified label-based rules
- Flows between K8s and non-K8s/Cloud workloads are correctly labeled at both endpoints
- Label mapping rules are configurable
- Supports major CNI telemetry sources (Cilium Hubble, Calico, etc.)

## Dependencies

### Illumio Label Mapping for Kubernetes Workloads

For the decoration pipeline to stamp Illumio labels onto flows, every K8s workload must carry both its Kubernetes-native labels and a corresponding set of Illumio labels before flows arrive at the platform.

One approach worth evaluating is automatic label mapping similar to what was implemented for C-VEN container workloads, where K8s-native labels are automatically translated into Illumio labels without requiring manual workload annotation.

The exact mechanism is not prescribed here, but the following must be true before exit criteria can be validated:

- Workloads carry a complete and current set of Illumio labels alongside their K8s labels
- Label assignments update when K8s labels change
- Mapping rules are customer-configurable (via UI or Helm chart)
