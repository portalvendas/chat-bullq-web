# Graph Report - chat-bullq-web  (2026-11-02)

## Corpus Check
- 230 files · ~164,172 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 542 nodes · 755 edges · 24 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `abb6b03d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- disparos.service.ts
- page.tsx
- dependencies
- tiny/page.tsx
- preferences.service.ts
- pipelines.service.ts
- channel-card.tsx
- CommercialSection.tsx
- tiny.service.ts
- produtividade/page.tsx
- dashboard.service.ts
- lead-cadastro-panel.tsx
- dashboard/page.tsx
- ai/page.tsx
- layout.tsx
- WaCostsSection.tsx
- funnel-audit/page.tsx
- cadences.service.ts
- brl
- meta-capi-card.tsx
- TinyOrdersPage
- chat-panel.tsx
- routine.service.ts

## God Nodes (most connected - your core abstractions)
1. `pipelinesService` - 11 edges
2. `fmtBRL()` - 8 edges
3. `ImportPage()` - 8 edges
4. `NotificationsBell()` - 7 edges
5. `brl()` - 7 edges
6. `MyDayBody()` - 6 edges
7. `dashboardService` - 5 edges
8. `todayLocal()` - 5 edges
9. `dur()` - 5 edges
10. `secs()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `DisparoDetailPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/[id]/page.tsx → src/features/disparos/services/disparos.service.ts
- `BroadcastRow()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts
- `yesterdayLocal()` --calls--> `todayLocal()`  [EXTRACTED]
  src/features/productivity/components/my-day-card.tsx → src/features/productivity/lib/format.ts
- `MyDayCard()` --calls--> `todayLocal()`  [EXTRACTED]
  src/features/productivity/components/my-day-card.tsx → src/features/productivity/lib/format.ts
- `MyDayBody()` --calls--> `brl()`  [EXTRACTED]
  src/features/productivity/components/my-day-card.tsx → src/features/productivity/lib/format.ts

## Import Cycles
- None detected.

## Communities (24 total, 0 thin omitted)

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

### Community 4 - "tiny/page.tsx"
Cohesion: 0.12
Nodes (13): ConversionRow(), convPct(), convPctLabel(), ENTRADA_LABEL, fmtDataHora(), fmtTempoSemContato(), LeadsNoResponseModal(), LeadsUnassignedModal() (+5 more)

### Community 5 - "preferences.service.ts"
Cohesion: 0.50
Nodes (3): InboxPreferences, preferencesService, UserPreferences

### Community 6 - "pipelines.service.ts"
Cohesion: 0.06
Nodes (37): channelIcons, ConversationListProps, filterOptions, ListFilter, ScopeFilter, scopeOptions, statusColors, COLORS (+29 more)

### Community 7 - "channel-card.tsx"
Cohesion: 0.47
Nodes (5): ChannelCard(), ChannelCardProps, channelTypeMap, CONNECTABLE, isDisconnected()

### Community 8 - "CommercialSection.tsx"
Cohesion: 0.09
Nodes (9): AUDIENCES, brl(), CohortSection(), CommercialSection(), EVO_COLORS, evoTooltip, MetaAdsPanel(), pct() (+1 more)

### Community 9 - "tiny.service.ts"
Cohesion: 0.09
Nodes (20): CapiDocStats, MetaCapiConfigInput, TinyDocument, TinyItem, TinyItemsResponse, TinyLeadCandidate, TinyLeadDocuments, TinyLeadNoResponse (+12 more)

### Community 10 - "produtividade/page.tsx"
Cohesion: 0.11
Nodes (25): AREA_LABEL, br(), clock(), isoToLocalDay(), PerDayTable(), ProdutividadePage(), SellerRow(), MyDayBody() (+17 more)

### Community 11 - "dashboard.service.ts"
Cohesion: 0.10
Nodes (19): AgentPerformance, BotPerformance, CsatBreakdown, DashboardOverview, IntakeHealth, KpiSparklines, MarketplaceStats, MessagesFlow (+11 more)

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
Cohesion: 0.13
Nodes (16): AppSidebar(), navItems, JarvisTree(), Tab, TABS, WaPaymentBanner(), dashboardService, hrefFor() (+8 more)

### Community 16 - "WaCostsSection.tsx"
Cohesion: 0.22
Nodes (8): brl(), CAT_META, CATS, WaCostDrill(), WaCostsSection(), WaCatKey, WaCostMessage, WaCostsData

### Community 17 - "funnel-audit/page.tsx"
Cohesion: 0.14
Nodes (16): actionBadge(), brl(), confBadge(), findingHint(), FindingsPanel(), fmtMin(), SEV, STATUS_TABS (+8 more)

### Community 18 - "cadences.service.ts"
Cohesion: 0.09
Nodes (27): CanvasInner(), dagreLayout(), HANDLE_COLOR, nodeTypes, SalesData, SalesNode, TemplatesCtx, toGraph() (+19 more)

### Community 19 - "brl"
Cohesion: 0.33
Nodes (7): brl(), ComprovantesSection(), fmtDate(), ItemsSubTable(), OrderRow(), ReceiptRow(), situacaoCls()

### Community 20 - "meta-capi-card.tsx"
Cohesion: 0.40
Nodes (3): MetaCapiConfig, TINY_PEDIDO_SITUACOES, tinyService

### Community 21 - "TinyOrdersPage"
Cohesion: 0.67
Nodes (3): calcTrend(), periodRange(), TinyOrdersPage()

### Community 28 - "chat-panel.tsx"
Cohesion: 0.07
Nodes (32): ChatPanel(), ChatPanelProps, LinkPreviewCard(), matchSingleUrl(), MessageText(), renderInlineTextWithLinks(), safeHostname(), statusIcons (+24 more)

### Community 29 - "routine.service.ts"
Cohesion: 0.15
Nodes (8): StepState, RoutineConfig, RoutineOptions, routineService, RoutineStageRef, RoutineStepConfig, RoutineStepToday, RoutineToday

## Knowledge Gaps
- **200 isolated node(s):** `AUDIENCES`, `EVO_COLORS`, `evoTooltip`, `DashboardOverview`, `CsatBreakdown` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pipelinesService` connect `pipelines.service.ts` to `disparos.service.ts`, `tiny/page.tsx`, `lead-cadastro-panel.tsx`, `layout.tsx`, `funnel-audit/page.tsx`, `meta-capi-card.tsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `api` connect `funnel-audit/page.tsx` to `tiny.service.ts`, `produtividade/page.tsx`, `dashboard.service.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `AUDIENCES`, `EVO_COLORS`, `evoTooltip` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `disparos.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `tiny/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._