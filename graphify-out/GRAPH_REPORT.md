# Graph Report - chat-bullq-web  (2026-09-20)

## Corpus Check
- 218 files · ~147,997 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 248 nodes · 303 edges · 12 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `25755487`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- disparos.service.ts
- page.tsx
- dependencies
- conversation-list.tsx
- preferences.service.ts
- pipelines.service.ts
- importar/page.tsx
- notifications-bell.tsx
- cadences.service.ts
- chat-panel.tsx
- routine.service.ts

## God Nodes (most connected - your core abstractions)
1. `fmtBRL()` - 9 edges
2. `ImportPage()` - 8 edges
3. `disparosService` - 5 edges
4. `CanvasInner()` - 5 edges
5. `pipelinesService` - 5 edges
6. `NotificationsBell()` - 5 edges
7. `scripts` - 5 edges
8. `microsToBRL()` - 4 edges
9. `NovoDisparoPage()` - 3 edges
10. `ImportarContatosPage()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `DisparoDetailPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/[id]/page.tsx → src/features/disparos/services/disparos.service.ts
- `BroadcastRow()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts
- `NovoDisparoPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/novo/page.tsx → src/features/disparos/services/disparos.service.ts
- `DisparosPage()` --calls--> `microsToBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts
- `DisparosPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+17 more)

### Community 1 - "disparos.service.ts"
Cohesion: 0.10
Nodes (21): DisparoDetailPage(), REC_STATUS, CONTACT_FIELDS, extractTokens(), NovoDisparoPage(), VarMap, BroadcastRow(), DisparosPage() (+13 more)

### Community 2 - "page.tsx"
Cohesion: 0.31
Nodes (9): BackfillResult, ImportPage(), loadXLSX(), NATIVE, num(), s(), slugify(), toIso() (+1 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (49): axios, class-variance-authority, clsx, @dagrejs/dagre, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion (+41 more)

### Community 4 - "conversation-list.tsx"
Cohesion: 0.13
Nodes (12): channelIcons, ConversationListProps, filterOptions, ListFilter, ScopeFilter, scopeOptions, statusColors, LeadDistributionConfig (+4 more)

### Community 5 - "preferences.service.ts"
Cohesion: 0.50
Nodes (3): InboxPreferences, preferencesService, UserPreferences

### Community 6 - "pipelines.service.ts"
Cohesion: 0.09
Nodes (25): COLORS, DraftStage, makeKey(), Props, StagesDialog(), TYPE_OPTIONS, BoardResponse, CardDetail (+17 more)

### Community 7 - "importar/page.tsx"
Cohesion: 0.47
Nodes (4): ImportarContatosPage(), loadXlsx(), pick(), Row

### Community 10 - "notifications-bell.tsx"
Cohesion: 0.29
Nodes (5): navItems, hrefFor(), IncomingNotification, NotificationsBell(), playBeep()

### Community 18 - "cadences.service.ts"
Cohesion: 0.09
Nodes (27): CanvasInner(), dagreLayout(), HANDLE_COLOR, nodeTypes, SalesData, SalesNode, TemplatesCtx, toGraph() (+19 more)

### Community 28 - "chat-panel.tsx"
Cohesion: 0.15
Nodes (11): ChatPanel(), ChatPanelProps, LinkPreviewCard(), matchSingleUrl(), MessageText(), renderInlineTextWithLinks(), safeHostname(), statusIcons (+3 more)

### Community 29 - "routine.service.ts"
Cohesion: 0.15
Nodes (8): StepState, RoutineConfig, RoutineOptions, routineService, RoutineStageRef, RoutineStepConfig, RoutineStepToday, RoutineToday

## Knowledge Gaps
- **108 isolated node(s):** `VarMap`, `CONTACT_FIELDS`, `PreviewLead`, `RateCardRow`, `BudgetUsage` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `pipelinesService` connect `pipelines.service.ts` to `disparos.service.ts`, `conversation-list.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `VarMap`, `CONTACT_FIELDS`, `PreviewLead` to the rest of the system?**
  _108 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `disparos.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1010752688172043 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `conversation-list.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._