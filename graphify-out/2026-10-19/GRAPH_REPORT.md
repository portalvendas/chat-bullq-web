# Graph Report - chat-bullq-web  (2026-10-19)

## Corpus Check
- 230 files · ~160,589 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 504 nodes · 693 edges · 21 communities (20 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `59a5c0f5`
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
- produtividade/page.tsx
- dashboard.service.ts
- lead-cadastro-panel.tsx
- dashboard/page.tsx
- ai/page.tsx
- layout.tsx
- WaCostsSection.tsx
- dashboardService
- cadences.service.ts
- chat-panel.tsx
- routine.service.ts

## God Nodes (most connected - your core abstractions)
1. `pipelinesService` - 9 edges
2. `dur()` - 8 edges
3. `fmtBRL()` - 8 edges
4. `ImportPage()` - 8 edges
5. `brl()` - 7 edges
6. `MyDayBody()` - 6 edges
7. `todayLocal()` - 6 edges
8. `hhmm()` - 6 edges
9. `secs()` - 6 edges
10. `brl()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `DisparoDetailPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/[id]/page.tsx → src/features/disparos/services/disparos.service.ts
- `BroadcastRow()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts
- `ProdutividadePage()` --calls--> `brl()`  [EXTRACTED]
  src/app/(dashboard)/produtividade/page.tsx → src/features/productivity/lib/format.ts
- `ProdutividadePage()` --calls--> `dur()`  [EXTRACTED]
  src/app/(dashboard)/produtividade/page.tsx → src/features/productivity/lib/format.ts
- `ProdutividadePage()` --calls--> `todayLocal()`  [EXTRACTED]
  src/app/(dashboard)/produtividade/page.tsx → src/features/productivity/lib/format.ts

## Import Cycles
- None detected.

## Communities (21 total, 1 thin omitted)

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
Cohesion: 0.09
Nodes (25): COLORS, DraftStage, makeKey(), Props, StagesDialog(), TYPE_OPTIONS, BoardResponse, CardDetail (+17 more)

### Community 7 - "channel-card.tsx"
Cohesion: 0.47
Nodes (5): ChannelCard(), ChannelCardProps, channelTypeMap, CONNECTABLE, isDisconnected()

### Community 8 - "CommercialSection.tsx"
Cohesion: 0.09
Nodes (9): brl(), CohortSection(), CommercialSection(), EVO_COLORS, evoTooltip, MetaAdsPanel(), pct(), CommercialData (+1 more)

### Community 9 - "tiny/page.tsx"
Cohesion: 0.06
Nodes (39): brl(), calcTrend(), ComprovantesSection(), ConversionRow(), convPct(), convPctLabel(), fmtDate(), fmtTempoSemContato() (+31 more)

### Community 10 - "produtividade/page.tsx"
Cohesion: 0.20
Nodes (15): AREA_LABEL, ProdutividadePage(), SellerDetail(), SellerRow(), MyDayBody(), MyDayCard(), yesterdayLocal(), brl() (+7 more)

### Community 11 - "dashboard.service.ts"
Cohesion: 0.11
Nodes (18): AgentPerformance, BotPerformance, CsatBreakdown, DashboardOverview, KpiSparklines, MarketplaceStats, MessagesFlow, MetaAdsStatus (+10 more)

### Community 12 - "lead-cadastro-panel.tsx"
Cohesion: 0.26
Nodes (7): fmtCep(), fmtDoc(), isJustCep(), LABELS, LeadCadastroPanel(), Cadastro, leadEnrichmentService

### Community 13 - "dashboard/page.tsx"
Cohesion: 0.10
Nodes (9): CHANNEL_COLORS, DashTab, tooltipStyle, TrendDirection, DashboardPeriodFilter(), DashPeriod, PERIOD_PRESETS, periodRange() (+1 more)

### Community 14 - "ai/page.tsx"
Cohesion: 0.07
Nodes (30): TIMEZONES, OpenAiKeyCard(), aiKeyService, AiKeyStatus, aiSettingsService, BusinessHoursConfig, BusinessHoursDay, DEFAULT_BUSINESS_HOURS (+22 more)

### Community 15 - "layout.tsx"
Cohesion: 0.18
Nodes (11): AppSidebar(), navItems, JarvisTree(), Tab, TABS, hrefFor(), IncomingNotification, NotificationsBell() (+3 more)

### Community 16 - "WaCostsSection.tsx"
Cohesion: 0.22
Nodes (8): brl(), CAT_META, CATS, WaCostDrill(), WaCostsSection(), WaCatKey, WaCostMessage, WaCostsData

### Community 18 - "cadences.service.ts"
Cohesion: 0.09
Nodes (27): CanvasInner(), dagreLayout(), HANDLE_COLOR, nodeTypes, SalesData, SalesNode, TemplatesCtx, toGraph() (+19 more)

### Community 28 - "chat-panel.tsx"
Cohesion: 0.05
Nodes (39): ChatPanel(), ChatPanelProps, LinkPreviewCard(), matchSingleUrl(), MessageText(), renderInlineTextWithLinks(), safeHostname(), statusIcons (+31 more)

### Community 29 - "routine.service.ts"
Cohesion: 0.15
Nodes (8): StepState, RoutineConfig, RoutineOptions, routineService, RoutineStageRef, RoutineStepConfig, RoutineStepToday, RoutineToday

## Knowledge Gaps
- **190 isolated node(s):** `CHANNEL_COLORS`, `TrendDirection`, `tooltipStyle`, `DashTab`, `AREA_LABEL` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pipelinesService` connect `pipelines.service.ts` to `disparos.service.ts`, `conversation-list.tsx`, `tiny/page.tsx`, `lead-cadastro-panel.tsx`, `layout.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `productivityService` connect `chat-panel.tsx` to `produtividade/page.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `CHANNEL_COLORS`, `TrendDirection`, `tooltipStyle` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `disparos.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `conversation-list.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._