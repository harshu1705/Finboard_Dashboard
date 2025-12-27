# Copilot Instructions — Finboard (Finance Dashboard)

## Quick context ✅
- Tech: **Next.js 14 (App Router)**, **TypeScript**, **Tailwind**, client-heavy widgets.
- Primary responsibility: small, self-contained dashboard widgets that fetch stock data from providers.
- Run locally: `npm install` → `npm run dev`. Build: `npm run build` / `npm start`.

## High‑priority notes for any task 🔎
- Environment variables (client-facing):
  - `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY` (required for Alpha Vantage).
  - `NEXT_PUBLIC_ALPHA_VANTAGE_BASE_URL` (optional override).
- Main code paths to inspect:
  - Providers: `lib/api/providers/*` (`alphaVantage.ts`, `finnhub.ts`, `fallback.ts`, `index.ts`).
  - Widgets: `components/widgets/*` (e.g., `stock-price/*`).
  - Store & persistence: `lib/stores/dashboardStore.ts` (see hydration & STORAGE_VERSION).
  - Cache: `lib/cache/cacheManager.ts` (in-memory + localStorage TTL, prefix `finance-dashboard-cache`).
  - Response utilities: `lib/utils/` (fieldExtraction, responseNormalizer, valueFormatter).

## Architecture & conventions (short) 🧭
- Widgets are fully isolated client components (`'use client'`) with their own hook (e.g., `useStockPrice`).
- Providers return a normalized shape (`NormalizedStockData`) and use custom errors (`ProviderError`, `NetworkError`, `RateLimitError`) from `lib/api/providers/types.ts`.
- `fetchWithFallback` (in `lib/api/providers/fallback.ts`) attempts preferred → fallback provider and returns `{ normalized, rawResponse, provider, usedFallback }`.
- Persistent dashboard state stored in `localStorage` under `groww-dashboard-state`. Update `STORAGE_VERSION` when changing persisted schema.
- Defensive style: prefer safe defaults, try/catch around field extraction, and non-crashing fallbacks (see many `if (process.env.NODE_ENV === 'development') console.warn(...)`). Follow the same style in new code.

## How to add a new provider (exact steps) 🔧
1. Add `lib/api/providers/<newProvider>.ts` that exports `async function fetchStockData(symbol: string): Promise<NormalizedStockData>`.
   - Use `ProviderError`, `NetworkError`, `RateLimitError` when appropriate.
   - Validate `symbol` and required env vars (fail fast with helpful message).
2. Export it from `lib/api/providers/index.ts`.
3. Add it to `PROVIDERS` in `lib/api/providers/fallback.ts` to enable automatic fallback.
4. Add friendly name mapping in `lib/utils/providerUtils.ts`.
5. Manually smoke-test: run `npm run dev`, add a widget using the new provider (or modify a template in `lib/templates/dashboardTemplates.ts`), and verify UI behavior and caching.

## How to add a new widget (exact steps) ✨
- Create folder `components/widgets/<widget-name>/` with a client component (`'use client'`) and local hook if needed.
- Add any new type(s) in `lib/types/widget.ts` (add to `WidgetType` and `WIDGET_TYPE_LABELS` if it's a new public kind).
- Provide sensible default config and initialization code similar to `StockPriceWidget` (safe defaults for `selectedFields`, `provider`, etc.).
- Add a template in `lib/templates/dashboardTemplates.ts` for quick manual testing.

## UX / Error handling patterns to follow 🛡️
- Treat rate limits and network issues as expected failure modes. Use `RateLimitError`/`NetworkError` to allow the UI to show graceful messages.
- Cache first on initial load (see `useStockPrice`): read `cacheManager` on initial load, refresh in background.
- When rawResponse is available, prefer `extractFields` → `formatFieldLabel` → `getNestedValue` for field selection.

## Testing & debugging tips 🐞
- No unit test framework in repo — tests are manual for now.
- Manual debug flow:
  - Run `npm run dev`, open the dashboard at `http://localhost:3000`.
  - Simulate provider failures: unset `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY` or set an invalid key; watch UI and console warnings.
  - Inspect localStorage keys `groww-dashboard-state` and `finance-dashboard-cache` to validate persistence.
- Lint with `npm run lint` before committing.

## PR checklist for AI-generated changes ✅
- Run dev and confirm no SSR hydration warnings (call `useDashboardStore._hydrate()` on client mount like in `app/page.tsx`).
- If persisted state schema changes, increment `STORAGE_VERSION` in `lib/stores/dashboardStore.ts` and provide migration notes.
- If adding a provider, add to fallback order and update `providerUtils` mapping.
- Add/update a template in `lib/templates/dashboardTemplates.ts` for manual verification.
- Keep changes strongly typed; add types to `lib/types/*.ts` when adding new shapes.

---

## CEO-level final product requirements (NON‑NEGOTIABLE) 🚨
This repo must ship exactly three widget types and support a four-step execution plan. Follow these rules strictly; copy the cursor prompts below when spinning up AI agents.

### Required widget types (locked) 🧩
- **widget.type** must be one of: `"card"`, `"table"`, `"chart"`
- Shared schema for widgets:
  - `id`, `title`, `apiConfig`, `refreshInterval`, `selectedFields`, `position`/`order`

### Feature matrix (must be supported)
1. TABLE WIDGET (MANDATORY)
   - Paginated table
   - Search bar
   - Sortable columns
   - Grid/table layout showing multiple stocks
   - Refresh interval respected
   - Last updated timestamp shown
   - Dynamic API field mapping
   - Persisted across refresh (Zustand + localStorage)
   - This is the official "Market / ETF / Stock list" view

2. FINANCE CARD WIDGET (MANDATORY — already implemented)
   - Single-stock price card
   - Refresh interval, provider fallback, editable name

3. CHART WIDGET (MANDATORY)
   - Line chart (minimum)
   - Time intervals: Daily, Weekly, Monthly
   - Uses same stock symbol and refresh interval
   - Integrated into the widget system and persisted

4. DRAG & DROP (MANDATORY)
   - Implement reordering for all widget types
   - Use `dnd-kit` (approved library)
   - Persist order in Zustand

---

## Execution order (CEO-approved plan) — implement in 4 steps ✅
Implement in this exact order with no scope creep. Each step is self-contained and must include a small manual verification test.

### Step 1 — Formalize TABLE widget (Priority)
CURSOR PROMPT — TABLE WIDGET (COPY EXACTLY)
"You are a senior frontend engineer.

Formalize the existing table view as a dedicated "table" widget type.

Requirements:
- Widget type = "table"
- Supports pagination
- Supports search
- Supports column sorting
- Displays multiple stocks in a grid/table
- Shows refresh interval and last updated timestamp
- Uses dynamic field mapping from API response
- Fully responsive
- Persist widget state in Zustand

Ensure this table widget matches the provided assignment screenshot.

Do NOT remove card widgets.
Do NOT hardcode API responses."

Files to inspect: `components/widgets/` (create `table` folder), `lib/stores/dashboardStore.ts` (persistence), `lib/templates/dashboardTemplates.ts` (add a table template), `lib/utils/fieldExtraction.ts` and `lib/utils/responseNormalizer.ts` (dynamic mapping).

### Step 2 — Drag & Drop (mandatory)
CURSOR PROMPT — DRAG & DROP (COPY EXACTLY)
"Implement drag-and-drop reordering for all widgets using dnd-kit.

Requirements:
- Widgets (card, table, chart) must be draggable
- Reordering updates widget order in Zustand store
- Order persists across refresh
- Smooth but minimal animations
- Add a subtle drag handle icon on each widget

Do NOT refactor widget rendering logic. Only enhance WidgetGrid and store."

Files to inspect: `components/dashboard/WidgetGrid.tsx`, `lib/stores/dashboardStore.ts` (use `reorderWidgets`), CSS/tailwind classes for handle styling.

### Step 3 — CHART widget
CURSOR PROMPT — CHART WIDGET (COPY EXACTLY)
"Implement a "chart" widget type using Recharts.

Requirements:
- Line chart only (no candlestick needed)
- Supports Daily, Weekly, Monthly intervals
- Uses existing API fetching logic
- Handles loading and error states gracefully
- Responsive layout
- Works inside WidgetRenderer

Ensure chart widgets can be added, reordered, and persisted like others."

Notes: Add `recharts` to dependencies (`npm install recharts`). Chart data may require a new provider method (time-series); if provider lacks historical endpoints, mock data for UI skeleton and add a TODO to implement historical fetch using AlphaVantage time series endpoints.

### Step 4 — Final polish (UI + UX)
CURSOR PROMPT — FINAL POLISH (COPY EXACTLY)
"Polish UI and UX across widgets.

Focus on:
- Clear table headers
- Better contrast in light mode
- Subtle hover and transition effects
- Visible delete action per widget
- Clean spacing and typography

Do NOT redesign. Only refine."

Files to inspect: any component under `components/` for visual consistency (Header, Widget containers, FieldSelectionPanel). Verify light/dark via `ThemeProvider`.

---

## Developer hints & install notes 🔧
- Add packages:
  - DnD: `@dnd-kit/core` and `@dnd-kit/sortable`
  - Charts: `recharts`
  - Install with `npm install @dnd-kit/core @dnd-kit/sortable recharts`
- Persisted ordering: store array index represents order (update `reorderWidgets` to persist positions if needed). Avoid relying on DOM indices alone.
- Matching screenshots: attach or link your reference images into the issue or PR and add a short visual checklist for verification.

---

If you want, I can start implementing Step 1 (Table widget) now and open a draft PR with a working table scaffold + tests for manual verification; confirm and I’ll proceed. 💡