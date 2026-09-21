# Graph Report - chat-bullq-web  (2026-08-14)

## Corpus Check
- 183 files · ~116,582 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 208 nodes · 241 edges · 11 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e78f504`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- package.json
- page.tsx
- dependencies
- conversation-list.tsx
- preferences.service.ts
- pipelines.service.ts
- notifications-bell.tsx
- cadences.service.ts
- chat-panel.tsx
- routine.service.ts

## God Nodes (most connected - your core abstractions)
1. `ImportPage()` - 8 edges
2. `CanvasInner()` - 5 edges
3. `scripts` - 5 edges
4. `pipelinesService` - 4 edges
5. `NotificationsBell()` - 4 edges
6. `routineService` - 3 edges
7. `MessageText()` - 3 edges
8. `dagreLayout()` - 3 edges
9. `GraphNodeType` - 3 edges
10. `WorkflowGraph` - 3 edges

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

## Communities (11 total, 0 thin omitted)

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

### Community 10 - "notifications-bell.tsx"
Cohesion: 0.43
Nodes (4): hrefFor(), IncomingNotification, NotificationsBell(), playBeep()

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
- **96 isolated node(s):** `StepState`, `RoutineStageRef`, `RoutineConfig`, `RoutineOptions`, `ScopeFilter` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `StepState`, `RoutineStageRef`, `RoutineConfig` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `conversation-list.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `pipelines.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0896551724137931 - nodes in this community are weakly interconnected._