# Finance Dashboard (Finboard)

A production-ready finance dashboard built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Zustand**. This repository includes assignment-focused UI polish and delivery-ready improvements: a refined Table widget, stable Drag & Drop, Import/Paste preview, Save-as-Template, TypeScript/runtime fixes, and unit tests.

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18 (recommended 18–20)
- npm >= 9

### Install dependencies

```bash
npm install
```

### Development

Start the app locally and open http://localhost:3000

```bash
npm run dev
```

### Build & Run (production)

```bash
npm run build
npm start
```

### Type-check & Lint

```bash
npx tsc --noEmit
npm run lint
```

---

## 🔍 Features & Highlights

- Table Widget
  - Full-width layout with `table-layout: fixed`, sticky header, truncation and horizontal scroll for small viewports.
  - Enforced required columns order and accessible keyboard sorting.
- Drag & Drop
  - dnd-kit based reordering with safe pointer handling; control clicks (Edit/Delete) do not accidentally start a drag.
- Import / Paste Preview
  - Paste JSON or upload a `.json` file, preview parsed widgets, and confirm replacing the dashboard.
- Templates
  - Save current dashboard as a named template (persisted to `localStorage`), load or delete saved templates via the Templates modal.
- TypeScript & Runtime Fixes
  - Fixed runtime vs. type-only imports, provider union issues, and other type-safety issues that previously caused build failures.
- Testing & QA
  - Unit tests (Vitest + Testing Library) for Table, Templates, and modal event integration.
- Accessibility & Responsive
  - Focus management for modals, `role="dialog"` with `aria-modal`, Escape to close, and keyboard sorting for table headers.

---

## 📋 How to Demo (Recruiter-friendly script)

1. Clone & install

```bash
git clone <repo-url>
cd Finboard_Dashboard
npm install
```

2. Run locally

```bash
npm run dev
```

3. Demo flows (2–4 minutes)
- **Add Widget** → Add **Market Overview** or **Stock Price**.
- **Table widget**: resize the window, show sticky header and horizontal scroll; show required column order and truncation.
- **Templates**: from header click **Templates** → Save current layout → Load a builtin template (e.g., Market Overview) and confirm replacement.
- **Import**: Header **Import** or EmptyState **Import Dashboard** → paste exported JSON → preview and confirm replace.
- **DnD**: Toggle **Reorder: On** in header and reorder widgets; show Edit/Delete controls do not start drags.

Tip: Empty dashboard offers **Choose a Template** and **Import Dashboard** CTAs for fast onboarding.

---

## ✅ Production Readiness Checklist

Before deploying app to production, ensure:

- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] `npm run build` completes successfully
- [ ] `npm run test` passes (Vitest unit tests)
- [ ] `npm run lint` passes
- [ ] Accessibility checks (axe or Playwright) run and pass for critical flows
- [ ] Environment vars are set securely in the hosting provider

> Note: Vitest may require `npm ci` in CI or a pinned Node version for deterministic runs.

---

## 🧪 Tests & CI

Run unit tests locally:

```bash
npm run test
```

Recommended CI workflow (GitHub Actions):
- Steps: install (npm ci), type-check (`npx tsc --noEmit`), build (`npm run build`), run tests (`npm run test -- --run`), report coverage.

If you’d like, I can add a ready-to-use GitHub Actions workflow to this repo.

---

## ⚙️ Environment Variables

Create a `.env.local` file for local development with any provider keys you need. Example:

```env
# API Keys (prefix with NEXT_PUBLIC_ for client-side usage)
NEXT_PUBLIC_ALPHA_VANTAGE_KEY=your_key_here
NEXT_PUBLIC_FINNHUB_KEY=your_key_here
```

No secrets are kept in the repo; ensure keys are provided by your environment/CI when building.

---

## ♿ Accessibility & Responsive Notes

- Modal focus is managed and initial inputs are focused when dialogs open.
- Dialogs use `role="dialog"` and `aria-modal` attributes.
- Keyboard: Escape closes modals; table headers support `Enter` to toggle sorting.
- Recommended follow-ups: Add Playwright accessibility checks (axe) to the CI pipeline and visual tests for critical flows.

---

## 🔧 What I changed (short changelog)

- Table UI polish (layout, sticky header, truncation)
- DnD control click safety
- Import (paste & file) modal + validation/preview
- Templates (save/load/delete) + persistence
- Fixed TypeScript & runtime import issues across providers
- Added Vitest + RTL tests for Table, Templates, and EmptyState integration

---

## 📦 Deployment

### Vercel (recommended)
1. Push to GitHub
2. Import on Vercel and set environment variables
3. Deploy (automatic on push)

### AWS (manual)
1. Build: `npm run build`
2. Use output in `./.vercel` or `.next` as appropriate with your hosting tooling

---

## 🧭 Contributing

1. Fork the repo
2. Create a topic branch
3. Open a PR with tests for new features or bug fixes
4. CI will run type-check, build, and tests

---

## 📞 Notes for reviewers / recruiters

- For a smooth demo, run `npm install` then `npm run dev` and follow the demo steps above.
- I can add a GitHub Actions workflow and/or a small Playwright E2E script to solidify CI coverage and give you a demo link.

---

## License

MIT

---

If you'd like, I can now add a GitHub Actions workflow that runs the type-check and tests on every PR, and optionally add a Playwright demo script or a short GIF to the README.


