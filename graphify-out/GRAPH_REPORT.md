# Graph Report - chat-bullq-web  (2026-11-10)

## Corpus Check
- 235 files · ~171,852 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 611 nodes · 871 edges · 27 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13fc1b2e`
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
- comissoes/page.tsx
- ai/page.tsx
- layout.tsx
- WaCostsSection.tsx
- funnel-audit/page.tsx
- cadences.service.ts
- brl
- meta-capi-card.tsx
- dashboard/page.tsx
- ConversionRow
- mobile-dashboard.tsx
- chat-panel.tsx
- routine.service.ts

## God Nodes (most connected - your core abstractions)
1. `pipelinesService` - 11 edges
2. `fmtBRL()` - 8 edges
3. `ImportPage()` - 8 edges
4. `brl()` - 7 edges
5. `NotificationsBell()` - 7 edges
6. `pct()` - 6 edges
7. `dashboardService` - 6 edges
8. `MyDayBody()` - 6 edges
9. `api` - 6 edges
10. `brlCompact()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `DisparoDetailPage()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/[id]/page.tsx → src/features/disparos/services/disparos.service.ts
- `BroadcastRow()` --calls--> `fmtBRL()`  [EXTRACTED]
  src/app/(dashboard)/disparos/page.tsx → src/features/disparos/services/disparos.service.ts
- `DashboardPage()` --calls--> `useDashboardView()`  [EXTRACTED]
  src/app/(dashboard)/dashboard/page.tsx → src/features/dashboard/hooks/use-dashboard-view.ts
- `LoginForm()` --calls--> `isMobileViewport()`  [EXTRACTED]
  src/features/auth/components/login-form.tsx → src/features/dashboard/hooks/use-dashboard-view.ts
- `yesterdayLocal()` --calls--> `todayLocal()`  [EXTRACTED]
  src/features/productivity/components/my-day-card.tsx → src/features/productivity/lib/format.ts

## Import Cycles
- None detected.

## Communities (27 total, 0 thin omitted)

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
Cohesion: 0.11
Nodes (16): calcTrend(), ENTRADA_LABEL, fmtDataHora(), fmtMinutes(), fmtTempoSemContato(), LeadsByChannelModal(), LeadsNoResponseModal(), LeadsUnassignedModal() (+8 more)

### Community 5 - "preferences.service.ts"
Cohesion: 0.50
Nodes (3): InboxPreferences, preferencesService, UserPreferences

### Community 6 - "pipelines.service.ts"
Cohesion: 0.05
Nodes (37): channelIcons, ConversationListProps, filterOptions, ListFilter, ScopeFilter, scopeOptions, statusColors, COLORS (+29 more)

### Community 7 - "channel-card.tsx"
Cohesion: 0.47
Nodes (5): ChannelCard(), ChannelCardProps, channelTypeMap, CONNECTABLE, isDisconnected()

### Community 8 - "CommercialSection.tsx"
Cohesion: 0.09
Nodes (9): AUDIENCES, brl(), CohortSection(), CommercialSection(), EVO_COLORS, evoTooltip, MetaAdsPanel(), pct() (+1 more)

### Community 9 - "tiny.service.ts"
Cohesion: 0.09
Nodes (21): CapiDocStats, LeadEntrada, MetaCapiConfigInput, TinyChannelRow, TinyDocument, TinyItem, TinyItemsResponse, TinyLeadCandidate (+13 more)

### Community 10 - "produtividade/page.tsx"
Cohesion: 0.11
Nodes (25): AREA_LABEL, br(), clock(), isoToLocalDay(), PerDayTable(), ProdutividadePage(), SellerRow(), MyDayBody() (+17 more)

### Community 11 - "dashboard.service.ts"
Cohesion: 0.10
Nodes (20): AgentPerformance, BotPerformance, CommercialData, CsatBreakdown, DashboardOverview, IntakeHealth, KpiSparklines, MarketplaceStats (+12 more)

### Community 12 - "lead-cadastro-panel.tsx"
Cohesion: 0.31
Nodes (7): fmtCep(), fmtDoc(), isJustCep(), LABELS, LeadCadastroPanel(), Cadastro, leadEnrichmentService

### Community 13 - "comissoes/page.tsx"
Cohesion: 0.18
Nodes (15): brl(), Comissoes(), currentMonth(), parseMoney(), pct(), PlanForm(), ReportRow(), ruleText() (+7 more)

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

### Community 21 - "dashboard/page.tsx"
Cohesion: 0.08
Nodes (13): CHANNEL_COLORS, DashboardPage(), DashTab, tooltipStyle, TrendDirection, LoginForm(), DashboardPeriodFilter(), DashPeriod (+5 more)

### Community 22 - "ConversionRow"
Cohesion: 0.67
Nodes (3): ConversionRow(), convPct(), convPctLabel()

### Community 23 - "mobile-dashboard.tsx"
Cohesion: 0.10
Nodes (21): AtendimentoTab(), brl(), brlCompact(), bucketLabel(), Funnel(), Metric, METRICS, mins() (+13 more)

### Community 28 - "chat-panel.tsx"
Cohesion: 0.06
Nodes (35): ChatPanel(), ChatPanelProps, LinkPreviewCard(), matchSingleUrl(), MessageText(), renderInlineTextWithLinks(), safeHostname(), statusIcons (+27 more)

### Community 29 - "routine.service.ts"
Cohesion: 0.15
Nodes (8): StepState, RoutineConfig, RoutineOptions, routineService, RoutineStageRef, RoutineStepConfig, RoutineStepToday, RoutineToday

## Knowledge Gaps
- **210 isolated node(s):** `CHANNEL_COLORS`, `TrendDirection`, `tooltipStyle`, `DashTab`, `DashboardView` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pipelinesService` connect `pipelines.service.ts` to `disparos.service.ts`, `tiny/page.tsx`, `layout.tsx`, `funnel-audit/page.tsx`, `meta-capi-card.tsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `api` connect `funnel-audit/page.tsx` to `tiny.service.ts`, `produtividade/page.tsx`, `dashboard.service.ts`, `comissoes/page.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `CHANNEL_COLORS`, `TrendDirection`, `tooltipStyle` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `disparos.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08258258258258258 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `tiny/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._