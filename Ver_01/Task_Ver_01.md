# AWAD AI Content Engine — Task Checklist v0.1

> **Version:** 0.1 | **Date:** 2026-02-20 | **Based on:** Plan_Ver_01.md
> **Last Audit:** 2026-02-28

**Legend:** `[ ]` To Do · `[/]` In Progress · `[x]` Done · `[!]` Blocked · `[~]` Deferred

---

## Phase 1 — Project Scaffold & Auth

### 1.1 Project Initialization
- [x] Run `npx create-next-app@latest awad-content-engine --typescript --tailwind --app`
- [x] Verify the dev server runs (`npm run dev`)
- [x] Set up ESLint + Prettier with a shared config
- [x] Create `.env.local` with all placeholder keys (from Plan §7)
- [x] Add `.env.local` to `.gitignore`
- [x] Create initial `README.md` with project overview

### 1.2 Supabase Setup
- [x] Create a new Supabase project (Free Tier)
- [x] Copy `SUPABASE_URL` and `ANON_KEY` into `.env.local`
- [x] Run SQL migration to create the `posts` table (schema from Plan §4)
- [~] ~~Run SQL migration to create the `linkedin_credentials` table~~ — *deferred to LinkedIn phase*
- [x] Enable Row-Level Security (RLS) on `posts` table
- [x] Write RLS policies: users can only read/write their own rows

### 1.3 Auth Integration
- [x] Install `@supabase/supabase-js` and `@supabase/auth-helpers-nextjs`
- [x] Create Supabase server/client utility files (`lib/supabase/`)
- [x] Build `/login` page with email + password form
- [x] Build `/api/auth/callback` route for Supabase auth redirect
- [x] Implement `middleware.ts` to protect all `/dashboard/*` routes
- [x] Test: unauthenticated users are redirected to `/login`

### 1.4 Dashboard Shell
- [x] Create `app/dashboard/layout.tsx` with sidebar + main area
- [x] Add sidebar navigation links: Dashboard, Posts, Settings
- [x] Build the Posts List page showing all posts with status badges
- [x] Add the prominent **"Generate Post"** button on the dashboard home
- [x] Implement the Post state badge component (color-coded by status)

---

## Phase 2 — Post Generation Pipeline (RAG)

### 2.1 Vector DB Setup
- [x] Create a Pinecone account and index (Free Tier, 768 dimensions)
- [x] Copy `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` into `.env.local`
- [x] Install `@pinecone-database/pinecone`
- [x] Create `lib/vectordb.ts` with `upsert()` and `query()` helper functions
- [ ] Test: successfully upsert and retrieve a test vector

### 2.2 Embedding Utility
- [x] Install `@google/generative-ai`
- [x] Copy `GEMINI_API_KEY` into `.env.local`
- [x] Create `lib/embed.ts` — `embed(text: string): Promise<number[]>` using `text-embedding-004`
- [ ] Test: verify embedding dimensions match the Pinecone index

### 2.3 Topic Suggestion Route
- [x] Create `app/api/generate-topic-ideas/route.ts`
- [x] Write a system prompt instructing Gemini to return 3–4 AWAD-relevant topics
- [x] Implement exponential backoff utility (`lib/retry.ts`)
- [x] Wrap the Gemini call with the retry utility
- [x] Test: route returns a valid JSON array of topic strings

### 2.4 Draft Generation Route
- [x] Create `app/api/generate-draft/route.ts`
- [x] Step 1: Embed the incoming topic string
- [x] Step 2: Query Pinecone — top 3 from `approved_posts` + top 2 from `style_lessons`
- [x] Step 3: Build a contextual system prompt with retrieved chunks
- [x] Step 4: Call Gemini text generation with the prompt
- [x] Step 5: Trigger image generation concurrently (`Promise.all`)
- [x] Return `{ postText, imageUrl, originalDraft }` to client
- [x] Test: route returns a complete draft object

### 2.5 Image Generation Route
- [x] Create `app/api/generate-image/route.ts`
- [x] Option A: Integrate Hugging Face Inference API (Stable Diffusion)
- [~] ~~Option B: Integrate Gemini Imagen 3~~ — *deferred, HF integration sufficient*
- [x] Return image as a public URL or base64 string
- [x] Test: route returns a valid image

---

## Phase 3 — Review & Refinement UI

### 3.1 Topic Selection Modal
- [x] Build `TopicSelectionStage` component
- [x] On open, call `/api/generate-topic-ideas` and display results as clickable chips
- [x] Add a manual text input for custom topics or URL paste
- [x] On topic selection, close modal and trigger draft generation
- [x] Show `"Building your post..."` loading skeleton during generation

### 3.2 Post Editor
- [x] Build `PostEditor` component
- [x] Left panel: editable `<textarea>` for post text (pre-filled with AI draft)
- [x] Right panel: generated image display
- [x] Store `originalDraft` in component state (never overwrite this value)
- [x] Display character count with LinkedIn's 3,000-character limit indicator

### 3.3 AI Refinement
- [x] Create `app/api/refine-draft/route.ts`
  - Accepts `{ currentText, instruction }`
  - Returns refined post text
- [x] Add "Refine with AI" input + button below the text editor
- [x] On submit, call the refine route, replace textarea content with result

### 3.4 Image Regeneration
- [x] Add "Regenerate Image" button below the image panel
- [x] On click, call `/api/generate-image` with the same topic context
- [x] Show loading spinner on the image panel during regeneration

---

## Phase 4 — Approval & Learning Loop

> **Note:** LinkedIn publishing (Publish Now / Schedule) is **deferred to a future phase**.
> Current scope: Generate → Review → Refine → Approve (saved locally in Supabase).

### 4.1 Approve Post Route
- [x] Create `app/api/approve-post/route.ts`
- [x] Install `diff` npm package
- [x] Compute diff between `originalDraft` and `finalText`
- [x] Build a Gemini prompt to infer writing rules from the diff
- [x] Embed `finalText` → upsert to Pinecone `approved_posts` namespace
- [x] Embed inferred rules → upsert to Pinecone `style_lessons` namespace
- [x] Update post `status` to `Approved` in Supabase
- [x] Test: approved post appears in Vector DB; Supabase status updated

### 4.2 Publishing Decision UI *(deferred)*
- [x] Add **"Approve"** button to the Post Editor
- [~] ~~On click, show the Publishing Decision Modal~~ — *deferred*
- [~] ~~Modal option 1: "Publish Now" → call `/api/publish-to-linkedin`~~ — *deferred*
- [~] ~~Modal option 2: "Schedule for Later" → date/time picker → `/api/schedule-post`~~ — *deferred*

### 4.3 LinkedIn OAuth Flow *(deferred)*
- [~] ~~Register a LinkedIn App in the LinkedIn Developer Portal~~ — *deferred*
- [~] ~~Add LinkedIn env vars to `.env.local`~~ — *deferred*
- [~] ~~Create `/api/auth/linkedin` route~~ — *code exists, not active*
- [~] ~~Create `/api/auth/linkedin/callback` route~~ — *code exists, not active*
- [~] ~~Store tokens in Supabase `linkedin_credentials`~~ — *deferred*
- [~] ~~Add "Connect LinkedIn" button in Settings~~ — *code exists, not active*

### 4.4 Publish Now Route *(deferred)*
- [~] ~~Full LinkedIn publishing flow~~ — *code exists, deferred to LinkedIn phase*

### 4.5 Schedule Post Route *(deferred)*
- [~] ~~Full scheduling flow~~ — *code exists, deferred to LinkedIn phase*

---

## Phase 5 — Scheduler (Cron Job) *(deferred)*

> **Entire phase deferred** — depends on LinkedIn publishing being active.

- [~] ~~Cron endpoint, Vercel cron config, GitHub Actions fallback~~ — *code exists, deferred*

---

## Phase 6 — Hardening & Deployment

### 6.1 Security Audit
- [x] Audit all API routes: confirm each route checks Supabase session
- [ ] Scan for any `NEXT_PUBLIC_` prefixed secrets (there should be none except Supabase URL/anon key)
- [ ] Add input sanitization to all user-facing fields (strip XSS, length limits)
- [ ] Confirm all `.env.local` values are set in Vercel Dashboard

### 6.2 Error Handling & UX Polish
- [x] Add a global React error boundary in `app/error.tsx`
- [x] Ensure all async operations have loading spinners and error messages
- [x] Add toast notifications for all key user actions (success + failure)
- [x] Add empty state UI for the Posts List when no posts exist

### 6.3 Testing (current scope)
- [x] Manually test: Generate → Edit → Refine → Approve flow
- [ ] Verify Vector DB state: check that approved posts and lessons are stored correctly

### 6.4 Deployment
- [ ] Push code to a GitHub repository
- [ ] Connect GitHub repo to a new Vercel project
- [ ] Set all environment variables in Vercel Dashboard
- [ ] Trigger a production deploy
- [ ] Run smoke test on the live URL

---

## Milestone Summary

| Milestone | Phase(s) | Deliverable | Status |
|---|---|---|---|
| **M1 — Auth & Shell** | 1 | Deployable app with login + dashboard skeleton | ✅ Done |
| **M2 — AI Generation** | 2 | Working `/api/generate-draft` with RAG retrieval | ✅ Done |
| **M3 — Editor** | 3 | Full review + refinement UI | ✅ Done |
| **M4 — Approve** | 4 | Approve flow with learning loop | ✅ Done |
| **M4b — Publish** | 4 | LinkedIn Publish Now + Schedule flows | 🔜 Deferred |
| **M5 — Scheduler** | 5 | Cron job publishing scheduled posts | 🔜 Deferred |
| **M6 — Launch** | 6 | Hardened, secure, fully deployed application | 🔶 Partial |
