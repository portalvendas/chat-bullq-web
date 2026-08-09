# Graph Report - chat-bullq-web  (2026-08-05)

## Corpus Check
- 167 files · ~102,046 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 86 nodes · 91 edges · 26 communities (4 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bff89de2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- package.json
- page.tsx
- dependencies
- axios
- clsx
- @dagrejs/dagre
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities
- framer-motion
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
- @tanstack/react-query
- @xyflow/react
- zod
- zustand

## God Nodes (most connected - your core abstractions)
1. `ImportPage()` - 8 edges
2. `scripts` - 5 edges
3. `NATIVE` - 2 edges
4. `slugify()` - 2 edges
5. `s()` - 2 edges
6. `num()` - 2 edges
7. `toIso()` - 2 edges
8. `loadXLSX()` - 2 edges
9. `BackfillResult` - 2 edges
10. `@dagrejs/dagre` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (26 total, 22 thin omitted)

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
Cohesion: 0.40
Nodes (5): class-variance-authority, lucide-react, dependencies, class-variance-authority, lucide-react

## Knowledge Gaps
- **40 isolated node(s):** `TRACKING`, `name`, `version`, `private`, `dev` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`, `axios`, `clsx`, `@dagrejs/dagre`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `framer-motion`, `@headlessui/react`, `@hookform/resolvers`, `next-themes`, `next`, `react`, `react-dom`, `react-hook-form`, `recharts`, `socket.io-client`, `sonner`, `tailwind-merge`, `@tanstack/react-query`, `@xyflow/react`, `zod`, `zustand`?**
  _High betweenness centrality (0.659) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.291) - this node is a cross-community bridge._
- **What connects `TRACKING`, `name`, `version` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._