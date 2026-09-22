# Pollee Inc — Configuration Dependencies

This document outlines every dependency in the current configuration of the Pollee Inc application: the runtime/platform stack, frontend libraries, backend functions and the external services/secrets they rely on, the data model and its entity relationships, built-in integrations, app connectors, and theme infrastructure.

> App name: **Pollee Inc**
> Published URL: https://pollee-app.base44.app
> Build commands: `npm install` · `npm run build` (Vite) · output `./dist`

---

## 1. Platform & Runtime

| Dependency | Version | Purpose |
|---|---|---|
| `@base44/sdk` | ^0.8.49 | Pre-initialized client for entities, auth, integrations, analytics |
| `@base44/vite-plugin` | ^1.0.41 | Vite build integration for the Base44 platform |
| `react` | ^18.2.0 | UI runtime |
| `react-dom` | ^18.2.0 | DOM renderer |
| `react-router-dom` | ^6.26.0 | Client-side routing (`BrowserRouter`, `Routes`, `Link`) |
| `vite` | ^6.1.0 | Dev server + bundler |
| `@vitejs/plugin-react` | ^4.3.4 | React Fast Refresh / JSX transform |
| `typescript` | ^5.8.2 | Type checking (jsconfig) |
| `eslint` + plugins | ^9.19.0 | Linting (`eslint-plugin-react`, `react-hooks`, `react-refresh`, `unused-imports`) |

The app shell (`src/App.jsx`) wraps everything in `AuthProvider`, `QueryClientProvider`, `BrowserRouter`, `Toaster`, `VisualEditAgent`, and `NavigationTracker`. Auth, sessions, and email verification are owned by the platform — no custom auth backend.

---

## 2. Frontend UI & Styling

### Design system
| Dependency | Version | Purpose |
|---|---|---|
| `tailwindcss` | ^3.4.17 | Utility-first CSS (dark mode via `class` strategy) |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities |
| `autoprefixer` / `postcss` | ^10.4.20 / ^8.5.3 | CSS processing |
| `class-variance-authority` | ^0.7.1 | Component variant styling (Button, Badge) |
| `clsx` | ^2.1.1 | Conditional class composition |
| `tailwind-merge` | ^3.0.2 | Class de-duplication (`cn` helper in `@/lib/utils`) |
| `lucide-react` | ^0.475.0 | Icon set (only existing icons used) |
| `next-themes` | ^0.4.4 | Theme provider backing `useTheme` dark-mode hook |

Design tokens live in `src/index.css` (`:root` + `.dark`) and are mapped in `tailwind.config.js`. A site-wide Dark Mode is implemented via the `useTheme` hook, `ThemeToggle` component, and CSS re-mapping rules in `index.css` (solid backgrounds, tinted text/border overrides). A no-flash script in `index.html` persists the theme choice.

### shadcn/ui component library (Radix UI primitives)
All Radix UI primitives backing the shadcn component set in `src/components/ui/`:

`@radix-ui/react-accordion`, `react-alert-dialog`, `react-aspect-ratio`, `react-avatar`, `react-checkbox`, `react-collapsible`, `react-context-menu`, `react-dialog`, `react-dropdown-menu`, `react-hover-card`, `react-label`, `react-menubar`, `react-navigation-menu`, `react-popover`, `react-progress`, `react-radio-group`, `react-scroll-area`, `react-select`, `react-separator`, `react-slider`, `react-slot`, `react-switch`, `react-tabs`, `react-toast`, `react-toggle`, `react-toggle-group`, `react-tooltip`.

Additional UI utilities: `cmdk` ^1.0.0 (command palette), `vaul` ^1.1.2 (drawer), `input-otp` ^1.4.2 (OTP input), `embla-carousel-react` ^8.5.2 (carousel), `react-resizable-panels` ^2.1.7 (resizable layouts), `react-day-picker` ^8.10.1 (calendar).

---

## 3. Feature Libraries

| Dependency | Version | Feature it powers |
|---|---|---|
| `@tanstack/react-query` | ^5.84.1 | Server state, data fetching, mutations, cache (`queryClientInstance` in `@/lib/query-client`) |
| `react-hook-form` | ^7.54.2 | Form state (registration, transaction form) |
| `@hookform/resolvers` / `zod` | ^4.1.2 / ^3.24.2 | Schema validation |
| `framer-motion` | ^11.16.4 | Animations (poll cards, comments, hero) |
| `recharts` | ^2.15.4 | Results charts / vote breakdowns |
| `react-leaflet` | ^4.2.1 | Postcode/franchise maps |
| `react-quill` | ^2.0.0 | Rich-text editing (infomarian bios, content) |
| `react-markdown` | ^9.0.1 | Markdown rendering |
| `@hello-pangea/dnd` | ^17.0.0 | Drag-and-drop (option ordering, task assignment) |
| `three` | ^0.171.0 | 3D models/games (available) |
| `jspdf` | ^2.5.2 | PDF generation (bio PDFs, reports) |
| `html2canvas` | ^1.4.1 | HTML-to-image capture for PDF export |
| `canvas-confetti` | ^1.9.4 | Vote-submission celebration |
| `date-fns` | ^3.6.0 | Date formatting (poll end dates, transactions) |
| `moment` | ^2.30.1 | Legacy date handling |
| `lodash` | ^4.17.21 | Utility helpers |
| `sonner` / `react-hot-toast` | ^2.0.1 / ^2.6.0 | Toast notifications |

---

## 4. Payments

| Dependency | Version | Purpose |
|---|---|---|
| `@stripe/react-stripe-js` | ^3.0.0 | React Stripe Elements (checkout UI) |
| `@stripe/stripe-js` | ^5.2.0 | Stripe.js loader |

Stripe is the configured payment provider for the app's region. The 0.55 AUD vote fee, tips, and payouts flow through Stripe via the backend functions below.

---

## 5. Backend Functions & External Services

Five backend functions live in `base44/functions/`. Each declares the secrets it needs (supplied out-of-band via the dashboard **Secrets** page).

### 5.1 `stripe-payments`
- **External service:** Stripe REST API (`https://api.stripe.com/v1/...`)
- **Secrets required:** `STRIPE_SECRET_KEY`
- **Actions:** `create_payment_intent`, `verify_payment`, `create_payout` (transfers to franchise/infomarian), `refund_payment`, `create_connected_account` (Express onboarding)
- **Entities touched:** reads/writes `Vote` (via webhook, not this function)

### 5.2 `stripe-webhook`
- **External service:** Stripe (webhook receiver — register the endpoint in the Stripe dashboard)
- **Endpoint URL (for Stripe dashboard):** `https://pollee-app.base44.app/functions/stripe-webhook`
- **Secrets required:** `STRIPE_WEBHOOK_SECRET`
- **Events handled:** `payment_intent.succeeded` → verifies `Vote`; `payment_intent.payment_failed` → rejects `Vote`; `transfer.paid`; `account.updated`
- **Entities touched:** `Vote` (filter + update status)

### 5.3 `discord-sync`
- **External service:** Discord API v10 (`https://discord.com/api/v10/...`)
- **Secrets required:** `DISCORD_BOT_TOKEN`, `DISCORD_WEBHOOK_URL` (optional — falls back to channel endpoint)
- **Actions:** `post_to_discord`, `fetch_from_discord`
- **Notes:** No app connector authorized yet; integration is secret-based.

### 5.4 `facebook-integration`
- **External service:** Facebook Graph API v18.0 (`https://graph.facebook.com/v18.0/...`)
- **Secrets required:** `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`
- **Actions:** `post_poll`, `fetch_comments`, `post_comment`

### 5.5 `bluesky-integration`
- **External service:** BlueSky / AT Protocol (`https://bsky.social/xrpc/...`)
- **Secrets required:** `BLUESKY_IDENTIFIER`, `BLUESKY_PASSWORD`
- **Actions:** `post_poll`, `fetch_replies` (authenticates via `createSession` each call)

### Secret inventory (declared across functions)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_WEBHOOK_URL`, `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`, `BLUESKY_IDENTIFIER`, `BLUESKY_PASSWORD`.

---

## 6. Built-in Core Integrations

Used through the pre-initialized `base44.integrations.Core` package:

| Endpoint | Used for |
|---|---|
| `InvokeLLM` | AI-assisted vote extraction from transaction descriptions (TransactionForm); optional `model` selection |
| `UploadPublicFile` | Uploading infomarian bio PDFs, media, public assets |
| `UploadPrivateFile` / `CreateFileSignedUrl` | Private file storage + signed download URLs |
| `ExtractDataFromUploadedFile` | Structured data extraction from uploaded CSV/Excel/PDF |
| `SendEmail` | Notifications to registered users (custom-domain required for non-registered recipients) |
| `GenerateImage` / `GenerateVideo` / `GenerateSpeech` | Media generation (available) |
| `TranscribeAudio` | Audio transcription (available) |
| `SendPushNotification` | Native mobile push (requires a published mobile build) |

---

## 7. App Connectors

**No app connectors are currently authorized.** Discord, Facebook, and BlueSky are integrated via backend-function secrets (see §5), not via OAuth connectors. The platform supports a wide connector catalog (Google, Slack, Notion, GitHub, etc.) but none are wired up for this app. No workspace (BYO shared) connectors are registered either.

---

## 8. Data Model & Entity Relationships

Eight entities define the data layer. Built-in attributes on every record: `id`, `created_date`, `updated_date`, `created_by_id`. `User` is built-in and read-only.

| Entity | Key relationships | Notes |
|---|---|---|
| `Franchise` | Owns polls; employs infomarians; holds bank account details (Yes/No/Undecided BSB + account) | Required: `franchise_name`, `postcode`, `state`, `owner_email` |
| `Infomarian` | Belongs to a `Franchise` (`franchise_id`); assigned to `Poll`s (`assigned_infomarians`) | `moderation_level` is an array (local/state/federal); tracks `total_earnings` |
| `Poll` | Created by a `Franchise`; moderated by `Infomarian`s; receives `Vote`s and `Comment`s | `poll_level` (local/state/federal) drives postcode/state eligibility; `moderation_status` pending/approved/rejected; `discussion_status` open/archived |
| `Vote` | References a `Poll` (`poll_id`, `poll_item_id`); may carry an `infomarian_id` and `voter_id` | `delegation_status` direct/delegated; `is_vote_change` tracks vote changes; `payment_breakdown` splits the 0.55 AUD fee |
| `Comment` | Belongs to a `Poll` (`poll_id`); optional `parent_comment_id` for threading | `author_type` member/public/infomarian; `moderation_status` pending/approved/rejected/flagged; `is_junior_member` for 12–17yr olds |
| `Delegation` | `delegator_user_id` → `delegate_user_id`; optional `poll_id` for specific-poll delegation | `delegation_type` open/specific_poll; status pending/verified/revoked |
| `InfomarianTask` | `assigned_to_id` / `assigned_by_id` (both infomarian IDs); optional `related_entity_type` + `related_entity_id` | `task_type` moderation/user_support/content_creation/poll_management |

### Cross-entity dependency flows
- **Voting flow:** `Poll` → `Vote` (transaction-verified) → `Franchise` bank accounts + `Infomarian` earnings.
- **Moderation flow:** `Poll` → `Comment` → `Infomarian` moderation → reputation/strikes.
- **Delegation flow:** `Delegation` → `Vote` (`delegated_votes_count` amplifies a delegate's vote).
- **Task flow:** `Infomarian` → `InfomarianTask` → related `Poll`/`Comment`/`User`.

---

## 9. Pages & Routing

Pages are registered in `src/pages.config.js` and rendered through the `pagesConfig` loop in `src/App.jsx`, wrapped by `src/Layout.jsx`. `NewUserRegistration` is added as an explicit `<Route>` outside the loop.

| Page | Role / purpose |
|---|---|
| `Home` | Landing — active polls, hero, discussion preview, democracy info, document links |
| `Vote` | Poll voting — eligibility, transaction form, live/final results, discussion |
| `Results` | Aggregated vote statistics and expandable result charts |
| `Admin` | Poll creation/management, vote verification, banking config (access: admins, franchise owners, infomarians) |
| `FranchiseAdmin` | Franchise + Infomarian CRUD (master franchiser / franchise manager) |
| `MasterFranchiserDashboard` | Top-level oversight dashboard |
| `FranchiseManagerDashboard` | Franchise-manager overview |
| `InfomarianDashboard` | Moderation queue, assigned polls, earnings, user support, tasks |
| `Profile` | User profile, reputation, vote history, delegation manager, avatar |
| `NewUserRegistration` | Registration flow (DOB DD/MM/YYYY, identity validation) |

Role-based navigation in `Layout.jsx` switches items by `user_role` (`master_franchiser`, `franchise_manager`, `infomarian`) and by record ownership (franchise owner, infomarian record). Super admin is matched by email.

---

## 10. Theme Infrastructure

- **Hook:** `src/hooks/useTheme.jsx` — persists choice to `localStorage`.
- **Toggle:** `src/components/ThemeToggle.jsx`.
- **CSS:** `src/index.css` — `:root` (light) and `.dark` token blocks, plus global `.dark` overrides that remap light Tailwind utility classes (gradients, `bg-white`, tinted backgrounds, text, borders, hover states) to dark equivalents.
- **No-flash:** inline script in `index.html` applies the stored theme before React mounts.
- `tailwind.config.js` uses `darkMode: ["class"]`.

---

## 11. Configuration Files

| File | Role |
|---|---|
| `base44/config.jsonc` | App name + site build/serve commands |
| `tailwind.config.js` | Theme tokens → Tailwind class mapping, dark mode, animations |
| `postcss.config.js` | Tailwind + autoprefixer pipeline |
| `jsconfig.json` | Path alias `@/` → `src/`, TS project for typecheck |
| `vite.config.js` | Vite + Base44 plugin config |
| `components.json` | shadcn/ui component config |
| `eslint.config.js` | Lint rules |
| `src/pages.config.js` | Page registry + layout + main page |
| `src/App.jsx` | Router, auth gate, providers, route loop |

---

## 12. Summary of External Service Dependencies

| Service | Integration method | Status |
|---|---|---|
| Stripe (payments) | Backend functions + secrets + webhook | Configured (secrets required) |
| Discord | Backend function + secrets | Configured (secrets required) |
| Facebook | Backend function + secrets | Configured (secrets required) |
| BlueSky | Backend function + secrets | Configured (secrets required) |
| Base44 Core (LLM, email, uploads, media) | Built-in `base44.integrations.Core` | Always available |
| OAuth app connectors | — | None authorized |

All external-service credentials must be supplied via the dashboard **Secrets** page before the corresponding backend functions will operate.