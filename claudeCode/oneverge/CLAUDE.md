# OneVerge Customer Portal

React/TypeScript ISP customer portal. Vite + Tailwind + Supabase + shadcn/ui.  
**GitHub:** `https://github.com/mahfujtamal/oneverge-efa9078e`  
Frontend source: `Resources/oneverge-efa9078e-main/` — all paths are relative to it.

## Commands

```bash
cd Resources/oneverge-efa9078e-main

npm install          # install deps
npm run dev          # Vite dev server
npm run build        # production build
npm run lint         # ESLint
npm test             # Vitest once
npm run test:watch   # Vitest watch

npx vitest run src/path/to/file.test.ts
```

Playwright e2e: `playwright.config.ts` + `playwright-fixture.ts` at project root.  
Path alias `@` → `src/`.

## ⚠️ Deployment Rules

- **Never** run `supabase db push`, `supabase migration up`, or `supabase functions deploy` locally.
- Migrations → new file in `supabase/migrations/` → developer applies via Lovable.
- Frontend → push to Lovable project. Do not `npm run build` for production.

## Reference Files

| Topic | File |
|-------|------|
| Auth & Session | `.claude/AUTH.md` |
| Database & RLS | `.claude/DB.md` |
| Edge Functions | `.claude/EDGE_FUNCTIONS.md` |
| Billing & Payments | `.claude/BILLING.md` |
| Patterns | `.claude/PATTERNS.md` |
| Key Components & Hooks | `.claude/COMPONENTS.md` |
