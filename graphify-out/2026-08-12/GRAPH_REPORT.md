# Graph Report - chat-bullq-web  (2026-08-11)

## Corpus Check
- 175 files · ~109,379 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 171 nodes · 199 edges · 29 communities (8 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db908b65`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- package.json
- page.tsx
- dependencies
- axios
- clsx
- pipelines.service.ts
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities
- notifications-bell.tsx
- @headlessui/react
- @hookform/resolvers
- next-themes
- next
- react
- react-dom
- react-hook-form
- cadences.service.ts
- socket.io-client
- sonner
- @dagrejs/dagre
- @tanstack/react-query
- @xyflow/react
- zod
- zustand
- lucide-react
- framer-motion
- chat-panel.tsx

## God Nodes (most connected - your core abstractions)
1. `ImportPage()` - 8 edges
2. `CanvasInner()` - 5 edges
3. `scripts` - 5 edges
4. `NotificationsBell()` - 4 edges
5. `MessageText()` - 3 edges
6. `dagreLayout()` - 3 edges
7. `GraphNodeType` - 3 edges
8. `WorkflowGraph` - 3 edges
9. `StagesDialog()` - 3 edges
10. `StageType` - 3 edges

## Surprising Connections (you probably didn't know these)
- `SalesData` --references--> `GraphNodeType`  [EXTRACTED]
  src/features/cadences/components/salesbot-canvas.tsx → src/features/cadences/services/cadences.service.ts
- `dagreLayout()` --references--> `WorkflowGraph`  [EXTRACTED]
  src/features/cadences/components/salesbot-canvas.tsx → src/features/cadences/services/cadences.service.ts
- `DraftStage` --references--> `StageType`  [EXTRACTED]
  src/features/pipelines/components/stages-dialog.tsx → src/features/pipelines/services/pipelines.service.ts
- `Props` --references--> `PipelineStage`  [EXTRACTED]
  src/features/pipelines/components/stages-dialog.tsx → src/features/pipelines/services/pipelines.service.ts

## Import Cycles
- None detected.

## Communities (29 total, 21 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 1 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 2 - "page.tsx"
Cohesion: 0.31
Nodes (9): BackfillResult, ImportPage(), loadXLSX(), NATIVE, num(), s(), slugify(), toIso() (+1 more)

### Community 3 - "dependencies"
Cohesion: 0.29
Nodes (7): class-variance-authority, dependencies, class-variance-authority, recharts, tailwind-merge, recharts, tailwind-merge

### Community 6 - "pipelines.service.ts"
Cohesion: 0.09
Nodes (25): COLORS, DraftStage, makeKey(), Props, StagesDialog(), TYPE_OPTIONS, BoardResponse, CardDetail (+17 more)

### Community 10 - "notifications-bell.tsx"
Cohesion: 0.43
Nodes (4): hrefFor(), IncomingNotification, NotificationsBell(), playBeep()

### Community 18 - "cadences.service.ts"
Cohesion: 0.09
Nodes (27): CanvasInner(), dagreLayout(), HANDLE_COLOR, nodeTypes, SalesData, SalesNode, TemplatesCtx, toGraph() (+19 more)

### Community 28 - "chat-panel.tsx"
Cohesion: 0.15
Nodes (11): ChatPanel(), ChatPanelProps, LinkPreviewCard(), matchSingleUrl(), MessageText(), renderInlineTextWithLinks(), safeHostname(), statusIcons (+3 more)

## Knowledge Gaps
- **78 isolated node(s):** `ChatPanelProps`, `statusIcons`, `TemplateButtonShape`, `TemplateElementShape`, `TemplatesCtx` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`, `axios`, `clsx`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@headlessui/react`, `@hookform/resolvers`, `next-themes`, `next`, `react`, `react-dom`, `react-hook-form`, `socket.io-client`, `sonner`, `@dagrejs/dagre`, `@tanstack/react-query`, `@xyflow/react`, `zod`, `zustand`, `lucide-react`, `framer-motion`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `ChatPanelProps`, `statusIcons`, `TemplateButtonShape` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `pipelines.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0896551724137931 - nodes in this community are weakly interconnected._
- **Should `cadences.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08602150537634409 - nodes in this community are weakly interconnected._
- **Should `chat-panel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._