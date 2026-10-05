# Graph Report - chat-bullq-web  (2026-10-05)

## Corpus Check
- 223 files · ~151,531 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 370 nodes · 470 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1c68ed0`
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
- channel-card.tsx
- CommercialSection.tsx
- tiny/page.tsx
- notifications-bell.tsx
- dashboard.service.ts
- lead-cadastro-panel.tsx
- dashboard/page.tsx
- jarvis-tree.tsx
- cadences.service.ts
- chat-panel.tsx
- routine.service.ts

## God Nodes (most connected - your core abstractions)
1. `fmtBRL()` - 8 edges
2. `ImportPage()` - 8 edges
3. `pipelinesService` - 7 edges
4. `dashboardService` - 5 edges
5. `brl()` - 5 edges
6. `LeadCadastroPanel()` - 5 edges
7. `disparosService` - 5 edges
8. `CanvasInner()` - 5 edges
9. `NotificationsBell()` - 5 edges
10. `scripts` - 5 edges

## Surprising Connections (you probably didn't know these)
- `DisparoDetailPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/[id]/page.tsx → src/features/disparos/services/disparos.service.ts
- `BroadcastRow()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts
- `DashboardPage()` --calls--> `periodRange()`  [EXTRACTED]
  src/app/(dashboard)/dashboard/page.tsx → src/features/dashboard/components/period-filter.tsx
- `DisparosPage()` --calls--> `microsToBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts
- `DisparosPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts

## Import Cycles
- None detected.

## Communities (18 total, 1 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+17 more)

### Community 1 - "disparos.service.ts"
Cohesion: 0.08
Nodes (25): DisparoDetailPage(), REC_STATUS, ImportarContatosPage(), loadXlsx(), pick(), Row, CONTACT_FIELDS, extractTokens() (+17 more)

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
Cohesion: 0.08
Nodes (26): COLOR_CLS, COLORS, DraftStage, makeKey(), Props, StagesDialog(), TYPE_OPTIONS, BoardResponse (+18 more)

### Community 7 - "channel-card.tsx"
Cohesion: 0.47
Nodes (5): ChannelCard(), ChannelCardProps, channelTypeMap, CONNECTABLE, isDisconnected()

### Community 8 - "CommercialSection.tsx"
Cohesion: 0.10
Nodes (8): brl(), CohortSection(), CommercialSection(), EVO_COLORS, evoTooltip, MetaAdsPanel(), pct(), IntakeHealth

### Community 9 - "tiny/page.tsx"
Cohesion: 0.18
Nodes (12): brl(), ConversionRow(), convPct(), convPctLabel(), fmtDate(), ItemsSubTable(), OrderRow(), PERIOD_LABELS (+4 more)

### Community 10 - "notifications-bell.tsx"
Cohesion: 0.33
Nodes (6): AppSidebar(), navItems, hrefFor(), IncomingNotification, NotificationsBell(), playBeep()

### Community 11 - "dashboard.service.ts"
Cohesion: 0.07
Nodes (28): WaPaymentBanner(), brl(), CAT_META, CATS, WaCostDrill(), WaCostsSection(), AgentPerformance, BotPerformance (+20 more)

### Community 12 - "lead-cadastro-panel.tsx"
Cohesion: 0.26
Nodes (7): fmtCep(), fmtDoc(), isJustCep(), LABELS, LeadCadastroPanel(), Cadastro, leadEnrichmentService

### Community 13 - "dashboard/page.tsx"
Cohesion: 0.10
Nodes (10): CHANNEL_COLORS, DashboardPage(), DashTab, tooltipStyle, TrendDirection, DashboardPeriodFilter(), DashPeriod, PERIOD_PRESETS (+2 more)

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
- **141 isolated node(s):** `DashboardOverview`, `CsatBreakdown`, `ReopenStats`, `KpiSparklines`, `VolumeByDay` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `pipelinesService` connect `pipelines.service.ts` to `disparos.service.ts`, `conversation-list.tsx`, `lead-cadastro-panel.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `DashboardOverview`, `CsatBreakdown`, `ReopenStats` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `disparos.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `conversation-list.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._