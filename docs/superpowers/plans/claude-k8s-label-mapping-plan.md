# Kubernetes Label Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rule-based Kubernetes Label Mapping feature that lets users define configurable rules mapping K8s-native metadata/labels into Illumio labels. These mapped labels make K8s workloads first-class participants in visibility, grouping, policy, enforcement, and Show Impact workflows.

**Architecture:** New `k8s_label_mapping_rules` and `workload_label_mappings` tables. A safe expression parser/evaluator (no eval). Express API routes for rule CRUD, preview, evaluate, and coverage. Client gets a full Label Mapping product area with guided builder, expression editor, preview, and coverage dashboard. Integration with existing Workload and Policy pages.

**Tech Stack:** React 19 + TypeScript strict, Astryx v0.2.0 design system, Express 5, better-sqlite3, Vite, Vitest + RTL, Playwright, MSW

## Global Constraints

- Astryx design system imports MUST use per-component subpath pattern: `import { X } from '@astryxdesign/core/X'`
- All API functions use `apiFetch` from `client/src/api/client.ts`
- Fixed UUIDs in seed data follow existing `prefix-name-NNN` pattern
- `getDb()` from `server/src/db/connection.ts` is the only database accessor
- `AuthenticatedRequest` from `server/src/middleware/auth.ts` provides `req.user.id`
- Extend `server/src/db/seed.ts` by appending, do not rewrite existing seed data
- Do NOT run broad formatters
- Do NOT commit unless explicitly asked

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| **Backend — Schema & Data** | | |
| `server/src/db/schema.sql` | Modify | Add `k8s_label_mapping_rules` and `workload_label_mappings` tables |
| `server/src/db/seed.ts` | Modify | Add seed mapping rules and evaluation results |
| **Backend — Rule Engine** | | |
| `server/src/lib/expression-parser.ts` | Create | Safe expression parser (tokenizer + AST builder) |
| `server/src/lib/expression-evaluator.ts` | Create | AST evaluator against workload context |
| `server/src/lib/guided-evaluator.ts` | Create | Guided condition evaluator (field/operator/value) |
| `server/src/lib/rule-engine.ts` | Create | Orchestrator: evaluate rules, generate labels, detect conflicts |
| `server/src/lib/regex-utils.ts` | Create | Regex validation, safe execution, capture group extraction |
| **Backend — API** | | |
| `server/src/routes/label-mapping.ts` | Create | CRUD + preview + evaluate + coverage endpoints |
| `server/src/index.ts` | Modify | Mount `/api/label-mapping` router |
| **Client — API** | | |
| `client/src/api/label-mapping.ts` | Create | Typed API functions for label mapping |
| **Client — Pages** | | |
| `client/src/pages/LabelMappingListPage.tsx` | Create | Rule list with coverage dashboard |
| `client/src/pages/LabelMappingDetailPage.tsx` | Create | Rule detail view |
| `client/src/pages/LabelMappingCreatePage.tsx` | Create | Create/edit rule page |
| **Client — Features** | | |
| `client/src/features/label-mapping/GuidedConditionBuilder.tsx` | Create | Visual condition builder component |
| `client/src/features/label-mapping/ExpressionEditor.tsx` | Create | Text-based expression editor |
| `client/src/features/label-mapping/TargetMappingConfig.tsx` | Create | Target dimension/value configuration |
| `client/src/features/label-mapping/RulePreview.tsx` | Create | Preview matched workloads table |
| `client/src/features/label-mapping/CoverageDashboard.tsx` | Create | Coverage summary cards |
| **Client — Routing & Nav** | | |
| `client/src/app/routes.tsx` | Modify | Add `/label-mapping` routes |
| `client/src/app/App.tsx` | Modify | Add SideNav item for Label Mapping |
| **Tests** | | |
| `server/src/lib/expression-parser.test.ts` | Create | Parser unit tests |
| `server/src/lib/expression-evaluator.test.ts` | Create | Evaluator unit tests |
| `server/src/lib/rule-engine.test.ts` | Create | Rule engine unit tests |
| `client/src/pages/LabelMappingListPage.test.tsx` | Create | List page unit tests |
| `tests/e2e/label-mapping.spec.ts` | Create | E2E tests |

---

## Phase 1: Backend Foundation

### 1.1 Database Schema
- [ ] Add `k8s_label_mapping_rules` table with all columns (id, name, description, enabled, priority, match_mode, conditions, condition_logic, expression, target_dimension, target_value_mode, target_value, target_source_field, target_transform, regex_pattern, regex_capture_group, conflict_behavior, created_by, timestamps)
- [ ] Add `workload_label_mappings` table (id, workload_id, rule_id, label_dimension, label_value, provenance, conflict, conflict_detail, evaluated_at)

### 1.2 Expression Parser
- [ ] Tokenizer: identifiers, strings, numbers, operators (==, !=, =~, !~, AND, OR), parentheses, brackets, field accessors
- [ ] AST builder: binary expressions, unary (exists, !exists), comparison, function calls
- [ ] Safety: no eval(), max expression length 4096, max 10 regex per expression

### 1.3 Expression Evaluator
- [ ] Evaluate AST nodes against workload context object
- [ ] Support all operators: ==, !=, =~, !~, contains, starts_with, ends_with, in, not_in, exists, !exists
- [ ] Regex execution with timeout protection
- [ ] Build workload context from DB row (cluster, namespace, deployment, pod, k8s labels, annotations)

### 1.4 Guided Condition Evaluator
- [ ] Evaluate {field, operator, value} conditions against workload context
- [ ] Support AND/OR logic between conditions
- [ ] Same operator set as expression evaluator

### 1.5 Rule Engine
- [ ] Load rules sorted by priority
- [ ] Evaluate each rule against each K8s workload
- [ ] Generate target labels (static, copy, regex_capture, transform)
- [ ] Detect conflicts (multiple rules → different values for same dimension; mapped vs manual)
- [ ] Return evaluation results with match status, proposed labels, conflicts

### 1.6 Regex Utilities
- [ ] Validate regex syntax before saving
- [ ] Safe regex execution with match timeout
- [ ] Capture group extraction

### 1.7 Seed Data
- [ ] 7 example mapping rules covering all value modes and operators
- [ ] Pre-computed evaluation results for existing K8s workloads

### 1.8 API Routes
- [ ] `GET /api/label-mapping/rules` — list all rules
- [ ] `POST /api/label-mapping/rules` — create rule
- [ ] `GET /api/label-mapping/rules/:id` — get rule detail
- [ ] `PATCH /api/label-mapping/rules/:id` — update rule
- [ ] `DELETE /api/label-mapping/rules/:id` — delete rule
- [ ] `POST /api/label-mapping/rules/:id/preview` — preview rule matches
- [ ] `POST /api/label-mapping/preview-expression` — validate and preview an expression
- [ ] `POST /api/label-mapping/evaluate` — run all enabled rules, update mappings
- [ ] `GET /api/label-mapping/coverage` — coverage statistics

---

## Phase 2: Frontend — Rule Management

### 2.1 API Layer
- [ ] TypeScript interfaces: MappingRule, MappingCondition, MappingPreviewResult, CoverageStats
- [ ] API functions for all endpoints

### 2.2 Label Mapping List Page
- [ ] Coverage dashboard cards (total K8s workloads, fully mapped, partial, unmapped, conflicts)
- [ ] Rules table with name, status, priority, target dimension, matched count, conflicts
- [ ] Create button, enable/disable toggle, delete action
- [ ] Empty state

### 2.3 Create/Edit Rule Page
- [ ] Name + description inputs
- [ ] Match mode toggle: Guided ↔ Expression
- [ ] Target mapping config (dimension + value mode + value)
- [ ] Conflict behavior selector
- [ ] Preview button
- [ ] Save/cancel actions

### 2.4 Guided Condition Builder
- [ ] Field selector (cluster, namespace, deployment, pod, service, k8s.labels[key], etc.)
- [ ] Operator selector (is, is not, contains, matches regex, exists, etc.)
- [ ] Value input (text, or enum for known fields)
- [ ] Add/remove condition rows
- [ ] AND/OR toggle between conditions

### 2.5 Expression Editor
- [ ] TextArea or code-like input for expression text
- [ ] Validation errors displayed inline
- [ ] Examples dropdown/helper
- [ ] Parsed expression summary

### 2.6 Rule Preview
- [ ] Table showing matched workloads with current vs proposed labels
- [ ] Conflict and warning indicators
- [ ] Summary counts

### 2.7 Routing & Navigation
- [ ] Add routes: `/label-mapping`, `/label-mapping/new`, `/label-mapping/:id`, `/label-mapping/:id/edit`
- [ ] Add "Label Mapping" to SideNav under Infrastructure section

---

## Phase 3: Integration

### 3.1 Workload Detail Enhancement
- [ ] Show Illumio labels section with provenance badges
- [ ] Show completeness indicator (R/A/E/L present/missing)
- [ ] Link to mapping rule that assigned each label

### 3.2 Policy Authoring
- [ ] Mapped Illumio labels available in scope/entity selectors
- [ ] Show matched workload counts where feasible

### 3.3 Show Impact
- [ ] Explain K8s workload matches via mapped labels
- [ ] Show flow decoration status

---

## Phase 4: Testing

### 4.1 Unit Tests
- [ ] Expression parser: valid expressions, syntax errors, edge cases
- [ ] Expression evaluator: all operators, nested expressions, regex
- [ ] Rule engine: priority ordering, conflict detection, value modes
- [ ] Guided evaluator: AND/OR logic, all operators

### 4.2 E2E Tests
- [ ] `/label-mapping` loads with coverage dashboard
- [ ] Create a guided rule
- [ ] Create an expression rule
- [ ] Preview matched workloads
- [ ] Enable/disable a rule
- [ ] Delete a rule
