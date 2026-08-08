# Codex Icon And Illustration Asset Guidance

Date: 2026-08-08

Scope: Asset guidance for the existing PolicyExperience prototype. This document is documentation-only and does not add dependencies or product code.

## Current Project Audit

### Astryx

PolicyExperience uses Astryx v0.2.0. The project guidance in `client/.claude/CLAUDE.md` requires:

- Per-component Astryx imports.
- No raw layout elements when Astryx layout components exist.
- Astryx components and tokens as the source of truth.
- `npx astryx component <Name>` and `npx astryx docs <topic>` before using unfamiliar UI.

Astryx icon docs confirm:

- Prefer semantic icon names when available.
- Custom SVG components must be passed through `Icon`.
- Meaningful standalone icons need a `label`.
- Use `Icon` size/color props instead of arbitrary sizing or hardcoded colors.
- Do not render raw SVG elements directly in product UI.

Commands run:

- `npx astryx docs icons`
- `npx astryx component Icon`
- `npx astryx docs illustrations`

### Existing Icon Usage

Current source usage found:

- `client/src/app/App.tsx`
  - `Icon icon="funnel"`
  - `Icon icon="wrench"`
- `client/src/features/rules/RuleTableColumns.tsx`
  - `Icon icon="chevronRight"`
- `client/src/pages/PolicyListPage.tsx`
  - Custom `LockIcon` SVG component passed into Astryx `Icon`

Docs/plans mention custom direction SVG concepts for ingress/egress. If implemented, those should be adapted to Astryx `Icon` or a small Astryx-compatible visual component rather than raw SVG output.

### Dependencies

`npm ls lucide-react --all` shows:

```text
policy-experience@
└─┬ policy-experience-client@ -> ./client
  └─┬ @astryxdesign/theme-neutral@0.2.0
    └── lucide-react@1.28.0
```

This means `lucide-react` is present transitively through the Astryx neutral theme. Do not rely on transitive dependency imports for product code. If PolicyExperience needs direct Lucide imports, add `lucide-react` as an explicit `client` dependency in a future implementation task.

## Recommended Icon Strategy

### Decision

Use this priority order:

1. Astryx semantic icons from `@astryxdesign/core/Icon`.
2. Existing custom SVG components wrapped with Astryx `Icon`, only when no semantic icon exists.
3. Direct `lucide-react` imports only if a product concept has no Astryx semantic icon and the team accepts adding it as a direct dependency.
4. Avoid adding Tabler, Heroicons, Phosphor, or another icon set unless Lucide coverage proves insufficient.

### Why

Astryx already defines icon sizing, color, accessibility, and theme behavior. Lucide is visually aligned with the neutral, enterprise style because it uses simple line icons and is already pulled in by Astryx theme-neutral. Adding another icon family risks mixed stroke style and visual noise.

## Icon Source Recommendations

| Source | License | Recommendation | Notes |
| --- | --- | --- | --- |
| Astryx `Icon` semantic names | Project design system | Use first | Available names include status, navigation, search, filter, copy, settings, and more-menu affordances. |
| Lucide / `lucide-react` | ISC | Use only as direct dependency if needed | Good match for policy-object concepts such as shield, tags, network, lock, boxes, server, route, globe, and database. |
| Tabler Icons | MIT | Avoid by default | Very broad catalog, but adding a second large line-icon family is unnecessary unless Lucide misses required concepts. |
| Heroicons | MIT | Avoid by default | Clean and MIT-licensed, but Tailwind visual language may not match Astryx/Lucide as naturally. |
| Phosphor Icons | MIT | Avoid by default | Flexible weights are useful, but mixed weights can erode consistency in dense enterprise UI. |

Sources:

- https://lucide.dev/license
- https://github.com/lucide-icons/lucide/blob/main/LICENSE
- https://github.com/tabler/tabler-icons
- https://github.com/tabler/tabler-icons/blob/master/LICENSE
- https://github.com/tailwindlabs/heroicons
- https://github.com/tailwindlabs/heroicons/blob/master/LICENSE

## Product Icon Coverage

| Product concept | Preferred treatment | Fallback if Astryx lacks a semantic icon |
| --- | --- | --- |
| Policies / policy list | Astryx `funnel` while V2 is policy-filter oriented | Lucide `FileText`, `ScrollText`, or `ShieldCheck` through adapter |
| Rules | Text/action token first; icon optional | Lucide `ListChecks` or `GitBranch` through adapter |
| Scope | Astryx `funnel` or no icon | Lucide `Crosshair`, `Focus`, or `ScanSearch` |
| Labels | Token UI first | Lucide `Tag` or `Tags` |
| Label groups | Token UI first | Lucide `Tags` or `Layers` |
| Services | Text plus service token | Lucide `Plug`, `Cable`, or `ServerCog` |
| IP lists / FQDNs | Text plus token color | Lucide `Globe`, `Network`, or `List` |
| Clusters | Text plus token | Lucide `Boxes`, `Network`, or `Container` |
| Namespaces | Text plus token | Lucide `Box`, `FolderTree`, or `Braces` |
| Workloads | Text plus token | Lucide `Server`, `Box`, or `Container` |
| Ingress | Direction visual, not standalone icon | Globe/arrow/scope visual using Astryx `Icon` wrappers |
| Egress | Direction visual, not standalone icon | Scope/arrow/globe visual using Astryx `Icon` wrappers |
| Templates | Table/list row text first | Lucide `Copy`, `Library`, or `BookTemplate` if available |
| Guardrails | Badge/token first | Lucide `Shield`, `ShieldCheck`, or `ShieldAlert` |
| Provisioning | Astryx status icons and `checkDouble` | Lucide `Rocket`, `UploadCloud`, or `Send` only if needed |
| Warnings/errors | Astryx `warning` / `error` | No fallback needed |
| Locks | Existing custom `LockIcon` wrapped by Astryx `Icon` is acceptable | Lucide `Lock` if Lucide is adopted directly |
| Impact preview | Text metrics/tokens first | Lucide `Activity`, `Radar`, or `ChartNetwork` |

## Adapter Requirement For Third-Party Icons

If direct Lucide usage is approved later, create one adapter rather than importing Lucide throughout product files.

Recommended future shape:

```tsx
// client/src/components/ProductIcon.tsx
import { Icon } from '@astryxdesign/core/Icon';
import type { IconProps } from '@astryxdesign/core/Icon';
import { Shield, Tags, Network, Globe, Lock } from 'lucide-react';

const icons = {
  guardrail: Shield,
  labels: Tags,
  cluster: Network,
  external: Globe,
  locked: Lock,
} as const;

type ProductIconName = keyof typeof icons;

export function ProductIcon({ name, ...props }: { name: ProductIconName } & Omit<IconProps, 'icon'>) {
  return <Icon icon={icons[name]} {...props} />;
}
```

Implementation rules:

- Keep all third-party icon imports in the adapter.
- Do not mix multiple third-party icon libraries.
- Use Astryx `Icon` for size, color, and accessibility.
- Provide `label` only for meaningful standalone icons.
- Decorative icons inside labeled buttons should not get duplicate labels.

## Direction Visual Guidance

The V2 spec needs ingress/egress visuals. Recommended treatment:

- Keep the chosen simpler arrow-first style.
- Use a compact, monochrome inline visual.
- Use Astryx `HStack`, `Icon`, and `Text`/visually hidden labeling rather than raw layout.
- Prefer semantic/available Astryx icons where possible:
  - Arrow: `chevronRight` or custom arrow component wrapped by `Icon`.
  - External world: custom globe component wrapped by `Icon`, or Lucide `Globe` through adapter if approved.
  - Scoped workload/entity: custom box/cube component wrapped by `Icon`, or Lucide `Box`/`Boxes` through adapter if approved.
- Do not use colorful illustrations for direction indicators inside dense rule tables.

## Illustration Strategy

### Decision

Illustrations are optional. Use them sparingly for:

- Empty states.
- First-run guidance.
- Help or onboarding panels.
- Low-density explanatory states.
- Permission/error states where a text-only state feels too abrupt.

Do not use illustrations in dense rule tables, policy create forms, provisioning diffs, or core policy editing rows.

### Recommended Sources

| Source | License / terms | Recommendation | Notes |
| --- | --- | --- | --- |
| Open Doodles | CC0 / public domain style terms | Preferred if illustrations are needed | Simple, editable, permissive. Use one consistent subset and recolor carefully. |
| Open Peeps | CC0 / public domain | Good for personas/onboarding only | More human/character oriented; avoid overusing in enterprise workflow screens. |
| unDraw | Free personal/commercial use, no attribution, but proprietary restrictions | Acceptable with restrictions documented | Do not redistribute as packs, replicate unDraw, create integrations, or use for ML training. |
| ManyPixels | Gallery says free personal/commercial use | Secondary; verify license at download time | Useful breadth, but document asset-specific terms before bundling. |
| Storyset | Free tier requires attribution | Avoid for product-bundled assets | Attribution requirement complicates enterprise app UI. |

Sources:

- https://www.opendoodles.com/about
- https://www.opendoodles.com/
- https://www.openpeeps.com/
- https://undraw.co/license
- https://www.manypixels.co/gallery
- https://storyset.com/faqs

## Illustration Usage Rules For PolicyExperience

- Pick only one illustration source per product surface.
- Store assets predictably if ever imported: `client/src/assets/illustrations/`.
- Keep an asset manifest documenting:
  - Source URL
  - License
  - Download date
  - File name
  - Any modifications
  - Whether attribution is required
- Use neutral, enterprise-appropriate scenes:
  - Empty policy list
  - No rule suggestions
  - No provisioning changes
  - Access denied / locked policy
  - First-time guardrail template explanation
- Avoid playful mascots, busy character scenes, or marketing hero illustrations.
- Ensure light/dark mode compatibility.
- In code, follow Astryx illustration docs for placement, but adapt sizing/styling to the local no-raw-value rule in `client/.claude/CLAUDE.md`.

## Install / Do Not Install Recommendation

For now:

- Do not install any new icon package.
- Do not install any illustration package.
- Continue using Astryx semantic icons.
- Keep `lucide-react` as a future direct dependency candidate if the V2 direction visual or policy-object icons cannot be covered cleanly through Astryx custom SVG components.

If implementation begins:

1. Search Astryx first: `npx astryx docs icons`, `npx astryx component Icon`, and `npx astryx search "empty state"`.
2. If Astryx coverage is insufficient, add `lucide-react` as a direct client dependency.
3. Add a local `ProductIcon` adapter.
4. Document the decision in this file or a short ADR.
5. Use CC0 illustration assets only if a specific product state needs them.
