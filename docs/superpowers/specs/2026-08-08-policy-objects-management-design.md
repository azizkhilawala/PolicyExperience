# Policy Objects Management

**Date:** 2026-08-08
**Context:** Full CRUD management for the four named policy object types — Services, IP Lists, Label Groups, and Virtual Services — plus integration into both the V1 and V2 rule editors for named-object selection and inline creation.

**Sources:**
- Existing PolicyExperience codebase (server and client)
- Existing backend patterns: `server/src/routes/v2-templates.ts`, `server/src/routes/resources.ts`
- Existing frontend patterns: `client/src/features/v2-rules/ConvertToTemplateDialog.tsx`, `client/src/features/v2-rules/V2ServiceEditor.tsx`, `client/src/features/v2-rules/V2EntityEditor.tsx`, `client/src/features/rules/ServiceEditor.tsx`, `client/src/features/rules/endpointConfig.ts`, `client/src/features/rules/endpointDisplay.ts`

---

## Summary of Changes

1. New `services` database table; timestamp columns added to `ip_lists`, `label_groups`, `virtual_services`
2. New `/api/objects` router with full CRUD for all four object types, including referential delete guards
3. New `client/src/api/objects.ts` with 20 typed API functions
4. New `/objects` page (`ObjectsPage.tsx`) with a four-tab layout and per-row edit/delete
5. Four dialog components in `client/src/features/objects/` for create/edit
6. V2 rule editor integration: named-service picker and inline-create in `V2ServiceEditor`; IP List and Label Group option groups with inline-create in `V2EntityEditor`
7. V1 rule editor integration: saved-service field added to `ServiceEditor`; IP List and Label Group fields added to `endpointConfig.ts` / `EndpointEditor`
8. Seed data for five canonical services; timestamp back-fill for existing seed rows

---

## 1. Data Model

### 1.1 New Table: `services`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | TEXT | PRIMARY KEY (UUID) |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | NOT NULL DEFAULT `''` |
| `port` | INTEGER | NOT NULL |
| `to_port` | INTEGER | nullable; present when defining a port range (e.g. 1000–2000) |
| `protocol` | TEXT | NOT NULL; values: `TCP`, `UDP`, `ICMP`, `GRE` |
| `created_by` | TEXT | NOT NULL; references a user ID |
| `created_at` | TEXT | NOT NULL; ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL; ISO 8601 timestamp |

The table is ordered by `name` in all list queries. There is no unique constraint on `name`; duplicates are allowed as long as they represent distinct configurations.

### 1.2 Existing Tables — Column Additions

Add three columns to each of the following tables. All three columns are `TEXT` and should be NOT NULL with a reasonable backfill default (empty string for the user ref, the current migration timestamp for the date fields).

**`ip_lists`** — existing columns: `id`, `name`, `cidr`, `description`
- Add: `created_by TEXT NOT NULL DEFAULT ''`
- Add: `created_at TEXT NOT NULL DEFAULT '<migration-time>'`
- Add: `updated_at TEXT NOT NULL DEFAULT '<migration-time>'`

**`label_groups`** — existing columns: `id`, `name`, `label_ids` (JSON)
- Add: `created_by`, `created_at`, `updated_at` (same pattern)

**`virtual_services`** — existing columns: `id`, `name`, `port`, `protocol`
- Add: `created_by`, `created_at`, `updated_at` (same pattern)

### 1.3 Migration Strategy

Apply changes as a new migration executed at startup (or via a migration script alongside `seed.ts`). The `getDb()` helper in `server/src/db/connection.ts` should run `ALTER TABLE … ADD COLUMN` statements guarded by a `PRAGMA table_info` check so they are safe to re-run.

---

## 2. Backend API

### 2.1 Router Location and Mounting

Create `server/src/routes/objects.ts`. Mount it in the main Express app at `/api/objects`, alongside the existing routers. Follow the same module structure as `v2-templates.ts`: `Router`, `getDb()`, `uuidv4()`, and `AuthenticatedRequest` for the `created_by` user reference.

### 2.2 Common Patterns

All four resources share the same structural pattern:

- **List** (`GET /`): `SELECT … ORDER BY name`, returns an array.
- **Get one** (`GET /:id`): returns 404 `{ error: '<Type> not found' }` when absent.
- **Create** (`POST /`): validates required fields, returns 400 on missing fields, inserts with a new UUID and `now` timestamps, returns 201 with the created row.
- **Update** (`PATCH /:id`): returns 404 if absent; uses `COALESCE(?, column)` for all nullable fields so that omitting a field leaves it unchanged; updates `updated_at` to now; returns 200 with the updated row.
- **Delete** (`DELETE /:id`): returns 404 if absent; runs a referential scan (see per-resource details below); returns 409 with a descriptive error string on conflict; otherwise deletes and returns 204.

The 409 error format matches the existing template delete guard in `v2-templates.ts`:
```
{ "error": "Cannot delete: referenced by N rules" }
```

### 2.3 Resource: Services (`/api/objects/services`)

**Required fields for POST:** `name`, `port`, `protocol`
**Optional fields for POST/PATCH:** `description`, `to_port`

**Delete guard:** Query both `v2_rules` and `rules` tables for rows whose `services` JSON column contains the service name. Count the total matching rows and return 409 if count > 0.

The `services` JSON column in `v2_rules` stores an array of objects with a `name` field when `type` is `'named'`. The scan should use SQLite's `json_each()` or a `LIKE '%"name":"<service-name>"%'` pattern; choose whichever is consistent with how other scans in the codebase are implemented.

**Response shape for list/get/create/patch:**
```
{ id, name, description, port, to_port, protocol, created_by, created_at, updated_at }
```

### 2.4 Resource: IP Lists (`/api/objects/ip-lists`)

**Required fields for POST:** `name`, `cidr`
**Optional fields for POST/PATCH:** `description`

**Delete guard:** Scan `v2_rules` and `rules` entity JSON columns for references where `field` is `'ip_list'` and `value` matches the IP list name. Return 409 with the total rule count if found.

**Response shape:** `{ id, name, cidr, description, created_by, created_at, updated_at }`

### 2.5 Resource: Label Groups (`/api/objects/label-groups`)

**Required fields for POST:** `name`, `label_ids` (JSON array of label ID strings)
**Optional fields for POST/PATCH:** (none beyond the required set)

The `label_ids` field is stored as a JSON-serialized TEXT column (existing schema). On read, parse it with `JSON.parse`. On write, serialize with `JSON.stringify`.

**Delete guard:** Scan `v2_rules` and `rules` entity JSON for `field: 'label_group'` references matching the group name. Return 409 if any found.

**Response shape:** `{ id, name, label_ids: string[], created_by, created_at, updated_at }`

### 2.6 Resource: Virtual Services (`/api/objects/virtual-services`)

**Required fields for POST:** `name`, `port`, `protocol`
**Optional fields for POST/PATCH:** (none beyond the required set)

**Delete guard:** Scan `v2_rules` and `rules` entity JSON for `field: 'virtual_service'` references matching the virtual service name. Return 409 if any found.

**Response shape:** `{ id, name, port, protocol, created_by, created_at, updated_at }`

### 2.7 Backward Compatibility

The read-only endpoints in `server/src/routes/resources.ts` — `GET /api/ip-lists`, `GET /api/label-groups`, `GET /api/virtual-services` — remain untouched and continue to function. The new writable endpoints at `/api/objects/…` are additive.

---

## 3. Client API Layer

### 3.1 File

Create `client/src/api/objects.ts`. This file exports four TypeScript interfaces and 20 async functions (five per object type).

### 3.2 Types

```typescript
export interface Service {
  id: string;
  name: string;
  description: string;
  port: number;
  to_port: number | null;
  protocol: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IpList {
  id: string;
  name: string;
  cidr: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LabelGroup {
  id: string;
  name: string;
  label_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VirtualService {
  id: string;
  name: string;
  port: number;
  protocol: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

### 3.3 Functions

All 20 functions use `apiFetch` from `../../api/client.js` following the same pattern as `v2-policies.ts` and `v2-templates.ts`.

**Services:**

| Function | Method | Path |
|----------|--------|------|
| `fetchServices()` | GET | `/api/objects/services` |
| `fetchServiceById(id)` | GET | `/api/objects/services/:id` |
| `createService(data)` | POST | `/api/objects/services` |
| `updateService(id, data)` | PATCH | `/api/objects/services/:id` |
| `deleteService(id)` | DELETE | `/api/objects/services/:id` |

`createService` accepts `{ name: string; port: number; protocol: string; to_port?: number | null; description?: string }`.
`updateService` accepts a partial of the same shape.

**IP Lists:**

| Function | Method | Path |
|----------|--------|------|
| `fetchIpLists()` | GET | `/api/objects/ip-lists` |
| `fetchIpListById(id)` | GET | `/api/objects/ip-lists/:id` |
| `createIpList(data)` | POST | `/api/objects/ip-lists` |
| `updateIpList(id, data)` | PATCH | `/api/objects/ip-lists/:id` |
| `deleteIpList(id)` | DELETE | `/api/objects/ip-lists/:id` |

`createIpList` accepts `{ name: string; cidr: string; description?: string }`.

**Label Groups:**

| Function | Method | Path |
|----------|--------|------|
| `fetchLabelGroups()` | GET | `/api/objects/label-groups` |
| `fetchLabelGroupById(id)` | GET | `/api/objects/label-groups/:id` |
| `createLabelGroup(data)` | POST | `/api/objects/label-groups` |
| `updateLabelGroup(id, data)` | PATCH | `/api/objects/label-groups/:id` |
| `deleteLabelGroup(id)` | DELETE | `/api/objects/label-groups/:id` |

`createLabelGroup` accepts `{ name: string; label_ids: string[] }`.

**Virtual Services:**

| Function | Method | Path |
|----------|--------|------|
| `fetchVirtualServices()` | GET | `/api/objects/virtual-services` |
| `fetchVirtualServiceById(id)` | GET | `/api/objects/virtual-services/:id` |
| `createVirtualService(data)` | POST | `/api/objects/virtual-services` |
| `updateVirtualService(id, data)` | PATCH | `/api/objects/virtual-services/:id` |
| `deleteVirtualService(id)` | DELETE | `/api/objects/virtual-services/:id` |

`createVirtualService` accepts `{ name: string; port: number; protocol: string }`.

Note: the existing `fetchIpLists`, `fetchLabelGroups`, and `fetchVirtualServices` functions in `client/src/api/policies.ts` hit the read-only `/api/ip-lists` etc. endpoints. They remain unchanged. The new functions in `objects.ts` target the writable `/api/objects/…` endpoints and return the richer shape including timestamp fields.

---

## 4. Objects Page

### 4.1 Route and File

- **Route:** `/objects`
- **Page component:** `client/src/pages/ObjectsPage.tsx`
- **Register in routes:** `client/src/app/routes.tsx` — add `{ path: '/objects', element: <ObjectsPage /> }` before the catch-all

### 4.2 Navigation

In `client/src/app/App.tsx`, add a `SideNavItem` between the existing "Policy-v2" item and the "Settings" item:

```
label="Objects"
href="/objects"
isSelected={location.pathname.startsWith('/objects')}
icon={<Icon icon="stack" />}
```

Use the same `SideNavItem` import already present at the top of `App.tsx`.

### 4.3 Page Layout

`ObjectsPage` renders a page-level heading "Policy Objects" followed by a `TabList` (from `@astryxdesign/core/TabList`) with four `Tab` items: **Services**, **IP Lists**, **Label Groups**, **Virtual Services**. Tab state is managed with `useState<string>` initialized to `'services'`.

Each tab panel is conditionally rendered based on the active tab. All four panels share the same structure:

1. A top action bar with a `Button` labeled `+ Create <Type>` (primary variant) that opens the corresponding dialog in create mode.
2. A `Table` (from `@astryxdesign/core/Table`) rendering the resource list.
3. A `Banner` (status `'error'`) visible when a delete 409 error has occurred, showing the error message and dismissable.

Page-level state per tab (or unified with tab-keyed maps):
- `items` — fetched array, refreshed on mount and after each create/edit/delete
- `loading` — boolean for table skeleton state
- `dialogOpen` — boolean controlling the create/edit dialog
- `editing` — the item currently being edited (null in create mode)
- `deleteError` — string | null for 409 messages

### 4.4 Table Columns

**Services tab:**

| Column | Source | Notes |
|--------|--------|-------|
| Name | `service.name` | |
| Port / Range | derived | If `to_port` is null: `service.port`. If `to_port` is set: `${port}–${to_port}` |
| Protocol | `service.protocol` | |
| Description | `service.description` | |
| Actions | `MoreMenu` | items: Edit, Delete |

**IP Lists tab:**

| Column | Source |
|--------|--------|
| Name | `ipList.name` |
| CIDR | `ipList.cidr` |
| Description | `ipList.description` |
| Actions | `MoreMenu` (Edit, Delete) |

**Label Groups tab:**

| Column | Source | Notes |
|--------|--------|-------|
| Name | `labelGroup.name` | |
| Labels | `labelGroup.label_ids` | Rendered as a horizontal `HStack` of `Token` components. Resolve label names by cross-referencing the labels list fetched from `/api/labels`. If a label ID cannot be resolved, display the raw ID. |
| Actions | `MoreMenu` (Edit, Delete) | |

**Virtual Services tab:**

| Column | Source |
|--------|--------|
| Name | `virtualService.name` |
| Port | `virtualService.port` |
| Protocol | `virtualService.protocol` |
| Actions | `MoreMenu` (Edit, Delete) |

### 4.5 Delete Flow

Clicking "Delete" in a row's `MoreMenu`:
1. Calls the appropriate `delete<Type>(id)` function.
2. On success (204): refreshes the list, clears `deleteError`.
3. On 409: sets `deleteError` to the error message string from the response body. The `Banner` becomes visible at the top of the tab panel.
4. On other errors: sets `deleteError` to a generic message.

No confirmation dialog is required for delete — the 409 guard on the server is the safety mechanism.

---

## 5. Create/Edit Dialogs

All four dialog components live in `client/src/features/objects/`. They share the dialog pattern from `client/src/features/v2-rules/ConvertToTemplateDialog.tsx`:

- `Dialog` + `DialogHeader` from `@astryxdesign/core/Dialog`
- `FormLayout` + `VStack` for the body
- `HStack` with Cancel (secondary) and Save/Create (primary) buttons in the footer
- `Banner` (status `'error'`) for errors, placed above the `FormLayout`
- `useEffect` that resets all local state when `isOpen` changes to `true`
- `useState` for each field, plus `submitting` and `error` booleans
- Dialog width: 480

### 5.1 ServiceDialog

**File:** `client/src/features/objects/ServiceDialog.tsx`

**Props:**
```typescript
interface ServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (service: Service) => void;
  service?: Service; // present in edit mode
}
```

**Form fields:**

| Component | Label | Required | Notes |
|-----------|-------|----------|-------|
| `TextInput` | Name | yes | |
| `TextInput` | Port | yes | `type="number"` semantics; accepts integer input |
| `TextInput` | Port Range End | no | labeled "Port Range End (optional)"; maps to `to_port`; blank means null |
| `Selector` | Protocol | yes | options: TCP, UDP, ICMP, GRE; default TCP |
| `TextArea` | Description | no | |

**Mode detection:** If `service` prop is provided, the dialog title is "Edit Service", the footer action is "Save", and all fields pre-populate from `service`. If `service` is absent, the title is "Create Service" and the footer action is "Create".

**Save action:**
- Create mode: calls `createService(data)` from `objects.ts`; on success, calls `onSaved(result)` then `onClose()`
- Edit mode: calls `updateService(service.id, data)`; on success, calls `onSaved(result)` then `onClose()`

### 5.2 IpListDialog

**File:** `client/src/features/objects/IpListDialog.tsx`

**Props:**
```typescript
interface IpListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (ipList: IpList) => void;
  ipList?: IpList;
}
```

**Form fields:**

| Component | Label | Required | Notes |
|-----------|-------|----------|-------|
| `TextInput` | Name | yes | |
| `TextInput` | CIDR | yes | placeholder: `10.0.0.0/8` or `192.168.1.1` |
| `TextArea` | Description | no | |

**Titles/actions:** "Create IP List" / "Create"; "Edit IP List" / "Save"

### 5.3 LabelGroupDialog

**File:** `client/src/features/objects/LabelGroupDialog.tsx`

**Props:**
```typescript
interface LabelGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (labelGroup: LabelGroup) => void;
  labelGroup?: LabelGroup;
}
```

**Form fields:**

| Component | Label | Required | Notes |
|-----------|-------|----------|-------|
| `TextInput` | Name | yes | |
| Multi-select | Labels | yes | Fetched from `/api/labels` on mount. Rendered as a `Selector` or `PowerSearch` in multi-select mode. Each option shows `${label.key}=${label.value}`. Selected IDs stored as `label_ids: string[]`. |

The labels fetch happens inside the component on mount (via `useEffect`). The `label_ids` field stores label IDs, not key-value strings. Display the resolved `key=value` string in the selector options.

**Titles/actions:** "Create Label Group" / "Create"; "Edit Label Group" / "Save"

### 5.4 VirtualServiceDialog

**File:** `client/src/features/objects/VirtualServiceDialog.tsx`

**Props:**
```typescript
interface VirtualServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (virtualService: VirtualService) => void;
  virtualService?: VirtualService;
}
```

**Form fields:**

| Component | Label | Required | Notes |
|-----------|-------|----------|-------|
| `TextInput` | Name | yes | |
| `TextInput` | Port | yes | integer |
| `Selector` | Protocol | yes | options: TCP, UDP; default TCP |

**Titles/actions:** "Create Virtual Service" / "Create"; "Edit Virtual Service" / "Save"

---

## 6. V2 Rule Editor Integration

### 6.1 V2ServiceEditor

**File:** `client/src/features/v2-rules/V2ServiceEditor.tsx` (existing, modify)

**Current behavior:** The `Selector` at the top is populated from `fetchVirtualServices()` (read-only endpoint) and adds items as `{ type: 'named', name: vs.name }`. Custom port entry is available as a fallback mode.

**New behavior:**

Add a second data source: `fetchServices()` from `client/src/api/objects.ts`. Both the existing virtual services list and the new named services list populate the same `Selector`. Structure the option list as:

1. `{ value: 'all', label: 'All Services' }` — existing
2. A section header or divider labeled "Named Services" — items from `fetchServices()`, each formatted as `${service.name} (${service.protocol}/${service.port})`
3. A section header or divider labeled "Virtual Services" — items from `fetchVirtualServices()` (unchanged)
4. Divider
5. `{ value: '__custom__', label: 'Add custom port…' }` — existing
6. `{ value: '__create_service__', label: '+ Create Service…' }` — new

When `__create_service__` is selected:
- Open `ServiceDialog` with `isOpen=true` and no `service` prop
- On `onSaved`, add the new service to the services array as `{ type: 'named', name: newService.name }` and refresh the services fetch
- On `onClose`, return the selector to its placeholder state

State additions to the component:
- `services: Service[]` — fetched from `fetchServices()` on mount
- `serviceDialogOpen: boolean` — controls the `ServiceDialog`

### 6.2 V2EntityEditor

**File:** `client/src/features/v2-rules/V2EntityEditor.tsx` (existing, modify in coordination with `v2EndpointConfig.ts`)

**Current behavior:** Delegates all configuration to `useV2EntityResources()` and `buildV2EntityConfig()` in `v2EndpointConfig.ts`. The resources hook fetches from `fetchIpLists()` and `fetchLabelGroups()` (read-only endpoints). The config already includes `ip_list` and `label_group` fields populated from those fetches.

**Issue:** The existing `ip_list` and `label_group` fields use data from the read-only endpoints, which do not include `created_by` / timestamp fields. After this change, the Objects page manages these through the writable endpoints. The read-only endpoint data and the new writable endpoint data are functionally identical for PowerSearch purposes (both expose `id` and `name`). No change to the data shape displayed in PowerSearch is needed.

**New behavior — inline create:**

`V2EntityEditor` needs two additional props (or internal state) to host inline-create dialogs:

```typescript
interface V2EntityEditorProps {
  value: EndpointFilter[];
  onChange: (filters: EndpointFilter[]) => void;
  direction: 'ingress' | 'egress';
  isDisabled?: boolean;
}
```

Props remain unchanged externally. Internally, add:
- A "+" or "Add Object" button rendered below or alongside the `PowerSearch`, opening a `DropdownMenu` with options: "Create IP List", "Create Label Group"
- `IpListDialog` and `LabelGroupDialog` rendered (conditionally mounted or always mounted with `isOpen`) within the editor
- On `onSaved` from either dialog: add a new `EndpointFilter` to `value` for the newly created object, then call `onChange`

The new `EndpointFilter` for an inline-created IP list:
```
{ field: 'ip_list', operator: 'is', value: { type: 'entity_list', value: [{ id: newIpList.id, label: newIpList.name }] } }
```

The new `EndpointFilter` for an inline-created label group:
```
{ field: 'label_group', operator: 'is', value: { type: 'entity_list', value: [{ id: newLabelGroup.id, label: newLabelGroup.name }] } }
```

After inline create, the `v2EndpointConfig.ts` resource hook should also re-fetch so the new item appears in subsequent PowerSearch suggestions. Since `useV2EntityResources` fetches on mount only, trigger a re-fetch by incrementing a `refreshKey` state in `V2EntityEditor` and passing it as a `useEffect` dependency down into the resources hook — or simply call the fetch functions imperatively and update the config.

The simplest approach: lift the `services`, `ipLists`, and `labelGroups` arrays into `V2EntityEditor` state, fetch them directly, and pass them into `buildV2EntityConfig`. This decouples the editor from the hook when inline-creates need to update the list.

### 6.3 `endpointDisplay.ts` — No Changes Needed

The `ip_list` and `label_group` fields are already present in `FIELD_COLOR_MAP` in `client/src/features/rules/endpointDisplay.ts` with colors `'orange'` and `'purple'` respectively. `getDisplayValue` handles `entity_list` values by joining `.label` strings. No modifications needed.

---

## 7. V1 Rule Editor Integration

### 7.1 ServiceEditor

**File:** `client/src/features/rules/ServiceEditor.tsx` (existing, modify)

**Current behavior:** Uses a static `PowerSearchConfig` named `SERVICE_CONFIG` with two fields: `protocol` (enum: TCP, UDP, ICMP) and `port` (string). The config is defined as a module-level constant with no dynamic data.

**New behavior:**

Convert `ServiceEditor` from a static config to a dynamic config that includes a third field for named services.

1. Fetch `fetchServices()` from `objects.ts` on component mount inside `ServiceEditor` using `useEffect` + `useState<Service[]>`.
2. Add a new `PowerSearchField` to the config with `key: 'saved_service'`, `label: 'Saved Service'`, `group: 'Named'`, operator `is`, value type `enum` populated from the fetched services list. Each enum value: `{ value: service.name, label: service.name }`.
3. Add a `Button` labeled `+ Create Service` (ghost or secondary, size sm) rendered alongside the `PowerSearch` in an `HStack`. Clicking it opens a `ServiceDialog` in create mode.
4. On `ServiceDialog` `onSaved`: append the new service to the local `services` state so it appears in the enum immediately; if the rule editor parent exposes a callback to re-render, call it.
5. When a `saved_service` filter is added via `PowerSearch`, `handleChange` converts it to a `RuleService` via a lookup: find the `Service` object by name and produce `{ protocol: service.protocol, port: String(service.port) }`.

The `SERVICE_CONFIG` constant must become a function or `useMemo`-derived object inside the component, since it now depends on dynamic data.

`ServiceEditor` renders its `PowerSearch` and the `+ Create Service` button in an `HStack` with `vAlign="end"` and `gap={1}`. The `ServiceDialog` is rendered as a sibling below the `HStack` with `isOpen` controlled by component state.

### 7.2 EndpointEditor and `endpointConfig.ts`

**Files:**
- `client/src/features/rules/EndpointEditor.tsx` (existing, modify)
- `client/src/features/rules/endpointConfig.ts` (existing, modify)

**Current behavior:** `EndpointEditor` uses `useEndpointResources()` from `endpointConfig.ts` which already fetches `fetchIpLists()` and `fetchLabelGroups()` (read-only endpoints). `buildEndpointConfig` already includes `ip_list` and `label_group` fields in the PowerSearch config. `endpointDisplay.ts` already colors and labels these fields.

The V1 endpoint editor therefore already supports IP lists and label groups as filter fields. No config changes are required for those two object types.

**New behavior — inline create:**

Add a `Button` labeled `+ Create` (ghost, size sm) rendered alongside the `PowerSearch` in `EndpointEditor`. Clicking it opens a `DropdownMenu` with two options:
- "Create IP List" — opens `IpListDialog`
- "Create Label Group" — opens `LabelGroupDialog`

On `onSaved` from either dialog:
1. Append the new item to the local state array (re-using the mutable `ipLists` / `labelGroups` state already managed by `useEndpointResources` — or trigger a re-fetch via a refresh key).
2. Add a new `EndpointFilter` to `value` for the new item, then call `onChange`.

The `EndpointFilter` shape for a newly created IP list:
```
{ field: 'ip_list', operator: 'is', value: { type: 'entity_list', value: [{ id: newIpList.id, label: `${newIpList.name} (${newIpList.cidr})` }] } }
```

The label format `${name} (${cidr})` matches how `makeEntitySource` in `endpointConfig.ts` labels IP list items.

The `EndpointFilter` for a newly created label group:
```
{ field: 'label_group', operator: 'is', value: { type: 'entity_list', value: [{ id: newLabelGroup.id, label: newLabelGroup.name }] } }
```

`IpListDialog` and `LabelGroupDialog` are rendered within `EndpointEditor` with `isOpen` controlled by component state. The `+ Create` button and its dropdown are rendered in an `HStack` alongside the `PowerSearch`.

**No changes to `endpointConfig.ts` field definitions:** The `ip_list` and `label_group` fields are already correctly defined. The only change is the re-fetch / state-update trigger after inline creation.

---

## 8. Seed Data

**File:** `server/src/db/seed.ts`

### 8.1 New Services (5 entries)

Add fixed UUID constants at the top of the file following the existing naming convention:

```
SVC_HTTPS = 'svc-https-443-tcp-0001'
SVC_HTTP  = 'svc-http-80-tcp-0002'
SVC_DNS   = 'svc-dns-53-udp-0003'
SVC_SSH   = 'svc-ssh-22-tcp-0004'
SVC_PG    = 'svc-postgres-5432-tcp-0005'
```

Insert each into the `services` table with:
- `name`: HTTPS, HTTP, DNS, SSH, PostgreSQL
- `port`: 443, 80, 53, 22, 5432
- `to_port`: null for all five
- `protocol`: TCP, TCP, UDP, TCP, TCP
- `description`: short human-readable description (e.g. "Secure HTTP over TLS")
- `created_by`: `USER_ALEX`
- `created_at` / `updated_at`: the seed's `now` constant

Use `db.prepare(…).run(…)` in a `try/catch` or with an `INSERT OR IGNORE` to make the seed idempotent.

### 8.2 Existing Seed Rows — Timestamp Back-fill

Update the existing `INSERT` statements for `ip_lists`, `label_groups`, and `virtual_services` to include the three new columns. Set `created_by` to `USER_ALEX`, and `created_at` / `updated_at` to the seed `now` constant. The existing fixed UUIDs (`IPL_*`, `LG_*`, `VS_*`) and all other field values remain unchanged.

---

## 9. File Change Summary

| File | Change |
|------|--------|
| `server/src/db/seed.ts` | Add `services` inserts; add timestamp columns to existing `ip_lists`, `label_groups`, `virtual_services` inserts |
| `server/src/db/connection.ts` (or migration file) | `ALTER TABLE` statements for the three existing tables; `CREATE TABLE services` |
| `server/src/routes/objects.ts` | New file — full CRUD for all four object types |
| `server/src/app.ts` (or equivalent entry point) | Mount `/api/objects` router |
| `client/src/api/objects.ts` | New file — 4 interfaces, 20 API functions |
| `client/src/pages/ObjectsPage.tsx` | New file — four-tab CRUD page |
| `client/src/app/routes.tsx` | Add `/objects` route |
| `client/src/app/App.tsx` | Add "Objects" `SideNavItem` |
| `client/src/features/objects/ServiceDialog.tsx` | New file |
| `client/src/features/objects/IpListDialog.tsx` | New file |
| `client/src/features/objects/LabelGroupDialog.tsx` | New file |
| `client/src/features/objects/VirtualServiceDialog.tsx` | New file |
| `client/src/features/v2-rules/V2ServiceEditor.tsx` | Add named-service options and `ServiceDialog` inline-create |
| `client/src/features/v2-rules/V2EntityEditor.tsx` | Add `+ Create` button and inline `IpListDialog` / `LabelGroupDialog` |
| `client/src/features/rules/ServiceEditor.tsx` | Add dynamic named-service enum field and `ServiceDialog` inline-create |
| `client/src/features/rules/EndpointEditor.tsx` | Add `+ Create` button and inline `IpListDialog` / `LabelGroupDialog` |

`client/src/features/rules/endpointConfig.ts`, `endpointDisplay.ts`, and `client/src/features/v2-rules/v2EndpointConfig.ts` require no changes to field definitions — `ip_list` and `label_group` are already wired up correctly for filtering. Changes are only needed for inline-create state refresh in `EndpointEditor` and `V2EntityEditor`.

---

## 10. Pending Items (Future Specs)

- **Provisioning workflow:** Draft → active state management for policy objects, mirroring the policy provision flow.
- **Virtual Service bindings:** Linking virtual services to workloads.
- **Client-side validation:** Port range validation (to_port > port, port within 1–65535), CIDR format validation (IPv4/IPv6 CIDR notation).
- **Bulk operations:** Multi-select delete, bulk CSV import for IP lists and services.
- **Search / filter on Objects page:** Per-tab text search input to filter the table client-side.
