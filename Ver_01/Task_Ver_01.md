# AWAD AI Content Engine — Task Checklist v0.1

> **Version:** 0.1 | **Date:** 2026-02-20 | **Based on:** Plan_Ver_01.md

**Legend:** `[ ]` To Do · `[/]` In Progress · `[x]` Done · `[!]` Blocked

---

## Phase 1 — Project Scaffold & Auth

### 1.1 Project Initialization
- [ ] Run `npx create-next-app@latest awad-content-engine --typescript --tailwind --app`
- [ ] Verify the dev server runs (`npm run dev`)
- [ ] Set up ESLint + Prettier with a shared config
- [ ] Create `.env.local` with all placeholder keys (from Plan §7)
- [ ] Add `.env.local` to `.gitignore`
- [ ] Create initial `README.md` with project overview

### 1.2 Supabase Setup
- [ ] Create a new Supabase project (Free Tier)
- [ ] Copy `SUPABASE_URL` and `ANON_KEY` into `.env.local`
- [ ] Run SQL migration to create the `posts` table (schema from Plan §4)
- [ ] Run SQL migration to create the `linkedin_credentials` table
- [ ] Enable Row-Level Security (RLS) on all tables
- [ ] Write RLS policies: users can only read/write their own rows

### 1.3 Auth Integration
- [ ] Install `@supabase/supabase-js` and `@supabase/auth-helpers-nextjs`
- [ ] Create Supabase server/client utility files (`lib/supabase/`)
- [ ] Build `/login` page with email + password form
- [ ] Build `/api/auth/callback` route for Supabase auth redirect
- [ ] Implement `middleware.ts` to protect all `/dashboard/*` routes
- [ ] Test: unauthenticated users are redirected to `/login`

### 1.4 Dashboard Shell
- [ ] Create `app/dashboard/layout.tsx` with sidebar + main area
- [ ] Add sidebar navigation links: Dashboard, Posts, Settings
- [ ] Build the Posts List page showing all posts with status badges
- [ ] Add the prominent **"Generate Post"** button on the dashboard home
- [ ] Implement the Post state badge component (color-coded by status)

---

## Phase 2 — Post Generation Pipeline (RAG)

### 2.1 Vector DB Setup
- [ ] Create a Pinecone account and index (Free Tier, 768 dimensions)
- [ ] Copy `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` into `.env.local`
- [ ] Install `@pinecone-database/pinecone`
- [ ] Create `lib/vectordb.ts` with `upsert()` and `query()` helper functions
- [ ] Test: successfully upsert and retrieve a test vector

### 2.2 Embedding Utility
- [ ] Install `@google/generative-ai`
- [ ] Copy `GEMINI_API_KEY` into `.env.local`
- [ ] Create `lib/embed.ts` — `embed(text: string): Promise<number[]>` using `text-embedding-004`
- [ ] Test: verify embedding dimensions match the Pinecone index

### 2.3 Topic Suggestion Route
- [ ] Create `app/api/generate-topic-ideas/route.ts`
- [ ] Write a system prompt instructing Gemini to return 3–4 AWAD-relevant topics
- [ ] Implement exponential backoff utility (`lib/retry.ts`)
- [ ] Wrap the Gemini call with the retry utility
- [ ] Test: route returns a valid JSON array of topic strings

### 2.4 Draft Generation Route
- [ ] Create `app/api/generate-draft/route.ts`
- [ ] Step 1: Embed the incoming topic string
- [ ] Step 2: Query Pinecone — top 3 from `approved_posts` + top 2 from `style_lessons`
- [ ] Step 3: Build a contextual system prompt with retrieved chunks
- [ ] Step 4: Call Gemini text generation with the prompt
- [ ] Step 5: Trigger image generation concurrently (`Promise.all`)
- [ ] Return `{ postText, imageUrl, originalDraft }` to client
- [ ] Test: route returns a complete draft object

### 2.5 Image Generation Route
- [ ] Create `app/api/generate-image/route.ts`
- [ ] Option A: Integrate Hugging Face Inference API (Stable Diffusion)
- [ ] Option B: Integrate Gemini Imagen 3 (if available on free key)
- [ ] Return image as a public URL or base64 string
- [ ] Test: route returns a valid image

---

## Phase 3 — Review & Refinement UI

### 3.1 Topic Selection Modal
- [ ] Build `TopicSelectionModal` component
- [ ] On open, call `/api/generate-topic-ideas` and display results as clickable chips
- [ ] Add a manual text input for custom topics or URL paste
- [ ] On topic selection, close modal and trigger draft generation
- [ ] Show `"Building your post..."` loading skeleton during generation

### 3.2 Post Editor
- [ ] Build `PostEditor` component
- [ ] Left panel: editable `<textarea>` for post text (pre-filled with AI draft)
- [ ] Right panel: generated image display
- [ ] Store `originalDraft` in component state (never overwrite this value)
- [ ] Display character count with LinkedIn's 3,000-character limit indicator

### 3.3 AI Refinement
- [ ] Create `app/api/refine-draft/route.ts`
  - Accepts `{ currentText, instruction }`
  - Returns refined post text
- [ ] Add "Refine with AI" input + button below the text editor
- [ ] On submit, call the refine route, replace textarea content with result

### 3.4 Image Regeneration
- [ ] Add "Regenerate Image" button below the image panel
- [ ] On click, call `/api/generate-image` with the same topic context
- [ ] Show loading spinner on the image panel during regeneration

---

## Phase 4 — Approval, Learning Loop & Publishing

### 4.1 Approve Post Route
- [ ] Create `app/api/approve-post/route.ts`
- [ ] Install `diff` npm package
- [ ] Compute diff between `originalDraft` and `finalText`
- [ ] Build a Gemini prompt to infer writing rules from the diff
- [ ] Embed `finalText` → upsert to Pinecone `approved_posts` namespace
- [ ] Embed inferred rules → upsert to Pinecone `style_lessons` namespace
- [ ] Update post `status` to `Approved` in Supabase
- [ ] Test: approved post appears in Vector DB; Supabase status updated

### 4.2 Publishing Decision UI
- [ ] Add **"Approve"** button to the Post Editor
- [ ] On click, call `/api/approve-post`, then show the **Publishing Decision Modal**
- [ ] Modal option 1: "Publish Now" → call `/api/publish-to-linkedin`
- [ ] Modal option 2: "Schedule for Later" → show date/time picker → call `/api/schedule-post`

### 4.3 LinkedIn OAuth Flow
- [ ] Register a LinkedIn App in the LinkedIn Developer Portal
- [ ] Add `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` to `.env.local`
- [ ] Create `/api/auth/linkedin` route → redirect to LinkedIn OAuth URL
- [ ] Create `/api/auth/linkedin/callback` route → exchange code for tokens
- [ ] Store `access_token`, `refresh_token`, `organization_urn` in Supabase `linkedin_credentials`
- [ ] Add a "Connect LinkedIn" button in the Settings page

### 4.4 Publish Now Route
- [ ] Create `app/api/publish-to-linkedin/route.ts`
- [ ] Fetch credentials from `linkedin_credentials` (check token expiry; refresh if needed)
- [ ] Build UGC post payload with text + image media asset
- [ ] POST to LinkedIn v2 API `/v2/ugcPosts`
- [ ] Update Supabase post: `status = 'Published'`, `published_at = NOW()`, `linkedin_post_id`

### 4.5 Schedule Post Route
- [ ] Create `app/api/schedule-post/route.ts`
- [ ] Save post to Supabase with `status = 'Scheduled'` and `target_timestamp`
- [ ] Show confirmation toast: "Post scheduled for [date/time]"

---

## Phase 5 — Scheduler (Cron Job)

### 5.1 Cron Endpoint
- [ ] Create `app/api/cron/publish-scheduled/route.ts`
- [ ] Validate `Authorization: Bearer <CRON_SECRET>` header
- [ ] Query Supabase: `status = 'Scheduled' AND target_timestamp <= NOW()`
- [ ] For each result, call the LinkedIn publish logic
- [ ] Update each post's `status` to `Published` in Supabase
- [ ] Log results (success / failure) per post

### 5.2 Vercel Cron Configuration
- [ ] Create `vercel.json` with cron schedule `"0 * * * *"` targeting the endpoint
- [ ] Set `CRON_SECRET` in Vercel Dashboard environment variables
- [ ] Test: manually trigger the cron endpoint and verify it processes due posts

### 5.3 Fallback: GitHub Actions
- [ ] Create `.github/workflows/publish-scheduled.yml`
- [ ] Schedule: `cron: '0 * * * *'`
- [ ] Step: `curl -X POST <deployed-url>/api/cron/publish-scheduled` with secret header
- [ ] Store the cron secret in GitHub Actions Secrets

---

## Phase 6 — Hardening & Deployment

### 6.1 Security Audit
- [ ] Audit all API routes: confirm each route checks Supabase session
- [ ] Scan for any `NEXT_PUBLIC_` prefixed secrets (there should be none except Supabase URL/anon key)
- [ ] Add input sanitization to all user-facing fields (strip XSS, length limits)
- [ ] Confirm all `.env.local` values are set in Vercel Dashboard

### 6.2 Error Handling & UX Polish
- [ ] Add a global React error boundary in `app/error.tsx`
- [ ] Ensure all async operations have loading spinners and error messages
- [ ] Add toast notifications for all key user actions (success + failure)
- [ ] Add empty state UI for the Posts List when no posts exist

### 6.3 Testing
- [ ] Manually test End-to-End flow: Generate → Edit → Approve → Publish Now
- [ ] Manually test: Generate → Edit → Approve → Schedule → Wait for Cron → Published
- [ ] Manually test: LinkedIn OAuth connect + disconnect flow
- [ ] Verify Vector DB state: check that approved posts and lessons are stored correctly

### 6.4 Deployment
- [ ] Push code to a GitHub repository
- [ ] Connect GitHub repo to a new Vercel project
- [ ] Set all environment variables in Vercel Dashboard
- [ ] Configure Vercel Cron Job in `vercel.json`
- [ ] Trigger a production deploy
- [ ] Run smoke test on the live URL

---

## Milestone Summary

| Milestone | Phase(s) | Deliverable |
|---|---|---|
| **M1 — Auth & Shell** | 1 | Deployable app with login + dashboard skeleton |
| **M2 — AI Generation** | 2 | Working `/api/generate-draft` with RAG retrieval |
| **M3 — Editor** | 3 | Full review + refinement UI |
| **M4 — Publish** | 4 | Approve → Publish Now + Schedule flows complete |
| **M5 — Scheduler** | 5 | Cron job publishing scheduled posts automatically |
| **M6 — Launch** | 6 | Hardened, secure, fully deployed application |
