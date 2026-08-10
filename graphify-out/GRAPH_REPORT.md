# Graph Report - chat-bullq-web  (2026-08-09)

## Corpus Check
- 168 files · ~104,069 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 123 nodes · 139 edges · 28 communities (7 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24b4705a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- package.json
- page.tsx
- class-variance-authority
- axios
- dependencies
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
- recharts
- socket.io-client
- sonner
- tailwind-merge
- stages-dialog.tsx
- @xyflow/react
- zod
- zustand
- lucide-react
- framer-motion

## God Nodes (most connected - your core abstractions)
1. `ImportPage()` - 8 edges
2. `scripts` - 5 edges
3. `NotificationsBell()` - 4 edges
4. `StagesDialog()` - 3 edges
5. `StageType` - 3 edges
6. `PipelineStage` - 3 edges
7. `pipelinesService` - 3 edges
8. `DraftStage` - 2 edges
9. `Props` - 2 edges
10. `makeKey()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `DraftStage` --references--> `StageType`  [EXTRACTED]
  src/features/pipelines/components/stages-dialog.tsx → src/features/pipelines/services/pipelines.service.ts
- `Props` --references--> `PipelineStage`  [EXTRACTED]
  src/features/pipelines/components/stages-dialog.tsx → src/features/pipelines/services/pipelines.service.ts

## Import Cycles
- None detected.

## Communities (28 total, 21 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 1 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 2 - "page.tsx"
Cohesion: 0.31
Nodes (9): BackfillResult, ImportPage(), loadXLSX(), NATIVE, num(), s(), slugify(), toIso() (+1 more)

### Community 5 - "dependencies"
Cohesion: 0.29
Nodes (7): clsx, @dagrejs/dagre, dependencies, clsx, @dagrejs/dagre, @tanstack/react-query, @tanstack/react-query

### Community 6 - "pipelines.service.ts"
Cohesion: 0.12
Nodes (16): BoardResponse, CardDetail, CardStatus, CardSummary, ContactConversationLite, ContactTagLite, ConversationCard, CreateCardInput (+8 more)

### Community 10 - "notifications-bell.tsx"
Cohesion: 0.43
Nodes (4): hrefFor(), IncomingNotification, NotificationsBell(), playBeep()

### Community 22 - "stages-dialog.tsx"
Cohesion: 0.22
Nodes (9): COLORS, DraftStage, makeKey(), Props, StagesDialog(), TYPE_OPTIONS, pipelinesService, PipelineStage (+1 more)

## Knowledge Gaps
- **57 isolated node(s):** `COLORS`, `TYPE_OPTIONS`, `CardStatus`, `Pipeline`, `CardSummary` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`, `class-variance-authority`, `axios`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@headlessui/react`, `@hookform/resolvers`, `next-themes`, `next`, `react`, `react-dom`, `react-hook-form`, `recharts`, `socket.io-client`, `sonner`, `tailwind-merge`, `@xyflow/react`, `zod`, `zustand`, `lucide-react`, `framer-motion`?**
  _High betweenness centrality (0.319) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `COLORS`, `TYPE_OPTIONS`, `CardStatus` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `pipelines.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._