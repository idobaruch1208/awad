# AWAD AI Content Engine — Implementation Plan v0.1

> **Version:** 0.1 | **Date:** 2026-02-20 | **Based on:** PRD_Ver_01.md

---

## 1. Project Summary

Build a zero-cost, internal Next.js web portal that enables the AWAD team to generate, refine, and schedule LinkedIn Company Page posts using a RAG-powered AI pipeline with a built-in learning loop.

---

## 2. Implementation Phases

```
Phase 1: Project Scaffold & Auth
        │
        ▼
Phase 2: Post Generation Pipeline (RAG)
        │
        ▼
Phase 3: Review & Refinement UI
        │
        ▼
Phase 4: Approval, Learning Loop & Publishing
        │
        ▼
Phase 5: Scheduler (Cron Job)
        │
        ▼
Phase 6: Hardening & Deployment
```

---

## 3. Phase Detail

### Phase 1 — Project Scaffold & Auth

**Goal:** Stand up the project skeleton, configure all services, and implement user authentication.

#### 3.1.1 Next.js Project Initialization
- Initialize a new Next.js 14+ project (App Router) with TypeScript.
- Configure Tailwind CSS for styling.
- Set up ESLint + Prettier.
- Create `.env.local` with placeholder keys for all external services.

#### 3.1.2 Supabase Setup
- Create Supabase project (Free Tier).
- Configure **Email/Password Auth** (or Magic Link for passwordless).
- Define **Row-Level Security (RLS)** policies from day one.
- Create the core database schema (see Section 4).

#### 3.1.3 Auth Integration
- Implement login / logout pages using `@supabase/auth-helpers-nextjs`.
- Protect all dashboard routes with a middleware auth guard.

#### 3.1.4 Dashboard Shell
- Implement a minimal dashboard layout: sidebar navigation + main content area.
- Add the prominent **"Generate Post"** CTA button.
- Add a **Posts List** view showing all posts and their statuses.

---

### Phase 2 — Post Generation Pipeline (RAG)

**Goal:** Wire up the Gemini API + Vector DB to generate brand-voice-aligned post drafts.

#### 3.2.1 Vector DB Setup
- Create a Pinecone (or Qdrant) index with dimension matching the embedding model (e.g., `text-embedding-004` → 768 dims).
- Define two namespaces: `approved_posts` and `style_lessons`.

#### 3.2.2 Embedding Pipeline
- Create a utility function `embed(text: string): Promise<number[]>` that calls the Gemini Embeddings API.
- Use this function for both storing and querying the Vector DB.

#### 3.2.3 Topic Suggestion API Route
**Route:** `POST /api/generate-topic-ideas`
- Accepts an optional context hint.
- Returns 3–4 topic suggestions via a lightweight Gemini prompt.
- Implements exponential backoff for rate-limit handling.

#### 3.2.4 Draft Generation API Route
**Route:** `POST /api/generate-draft`
1. Embed the user's chosen topic.
2. Query Vector DB → retrieve top 3 `approved_posts` + top 2 `style_lessons`.
3. Construct a system prompt embedding the retrieved context.
4. Call Gemini API to generate the post text.
5. Concurrently call the Image Generation API.
6. Return `{ postText, imageUrl, originalDraft }` to the client.

#### 3.2.5 Image Generation API Route
**Route:** `POST /api/generate-image`
- Calls Hugging Face Inference API (Stable Diffusion) or Gemini Imagen 3.
- Returns the generated image as a URL or base64 blob.

---

### Phase 3 — Review & Refinement UI

**Goal:** Give users a rich, intuitive editor to review and perfect AI-generated content.

#### 3.3.1 Post Editor Component
- Display generated post text in an editable `<textarea>` (or rich-text editor).
- Display generated image alongside the text.
- Store the `originalDraft` in component state for later diff calculation.

#### 3.3.2 AI Refinement
- Add a secondary input field: *"Refine with AI..."*
- On submit, call `POST /api/refine-draft` with the current text + the user's instruction.
- Replace the editor content with the refined output.

#### 3.3.3 Image Regeneration
- "Regenerate Image" button calls `/api/generate-image` again with the same context.
- Replaces the displayed image with the new result.

---

### Phase 4 — Approval, Learning Loop & Publishing

**Goal:** Capture the final approved post, train the RAG system, and publish to LinkedIn.

#### 3.4.1 Approval & Diff Calculation
**Route:** `POST /api/approve-post`
1. Receive `{ originalDraft, finalText, postId }`.
2. Compute the diff (e.g., using `diff` npm package).
3. Infer writing style rules from the diff via a Gemini prompt.
4. Embed the `finalText` + save to `approved_posts` namespace in Vector DB.
5. Embed the inferred rules + save to `style_lessons` namespace in Vector DB.
6. Update post status to `Approved` in Supabase.

#### 3.4.2 Publishing Routes
**Publish Now:** `POST /api/publish-to-linkedin`
- Exchange stored OAuth token for access if expired (refresh flow).
- Send post payload to LinkedIn v2 API (`/v2/ugcPosts`).
- Update Supabase post status to `Published`, log timestamp.

**Schedule for Later:** `POST /api/schedule-post`
- Save post to Supabase with `status = 'Scheduled'` and `target_timestamp`.

#### 3.4.3 LinkedIn OAuth 2.0 Flow
- Implement `/api/auth/linkedin/callback` to handle the OAuth redirect.
- Store `access_token`, `refresh_token`, and `organization_urn` securely in Supabase (encrypted column or Vault).
- Required scopes: `w_organization_social`, `rw_organization_admin`.

---

### Phase 5 — Scheduler (Cron Job)

**Goal:** Automatically publish all due scheduled posts on time.

#### 3.5.1 Cron Endpoint
**Route:** `POST /api/cron/publish-scheduled`
- Protected by a `CRON_SECRET` header to prevent unauthorized triggers.
- Queries Supabase: `status == 'Scheduled' AND target_timestamp <= NOW()`.
- For each result, calls the LinkedIn publish logic and updates status to `Published`.

#### 3.5.2 Cron Configuration
- **Vercel:** Add `vercel.json` cron config: `"0 * * * *"` (every hour).
- **Fallback:** GitHub Actions workflow calling the cron endpoint every hour.

---

### Phase 6 — Hardening & Deployment

**Goal:** Secure, test, and deploy the complete application.

#### 3.6.1 Security Hardening
- Audit all API routes: ensure every route validates the user's Supabase session.
- Confirm zero secret exposure to the client (`NEXT_PUBLIC_` prefix audit).
- Add input sanitization on all user-facing fields before passing to any API.

#### 3.6.2 Error Handling & Resilience
- Global error boundary in the UI.
- All external API calls wrapped in retry logic with exponential backoff.
- Graceful loading and error states for all async operations.

#### 3.6.3 Deployment
- Push to GitHub repository.
- Connect repository to Vercel project.
- Set all environment variables in Vercel Dashboard.
- Configure Vercel Cron Job.
- Run end-to-end smoke test.

---

## 4. Database Schema (Supabase)

### Table: `posts`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `user_id` | `uuid` FK → auth.users | Owner |
| `topic` | `text` | The chosen topic or URL |
| `original_draft` | `text` | Raw AI-generated text |
| `final_text` | `text` | User-approved final text |
| `image_url` | `text` | URL of the generated image |
| `status` | `enum` | `Draft`, `Reviewing`, `Approved`, `Scheduled`, `Published` |
| `target_timestamp` | `timestamptz` | When to publish (if Scheduled) |
| `published_at` | `timestamptz` | Actual publish time |
| `linkedin_post_id` | `text` | ID returned by LinkedIn API |
| `created_at` | `timestamptz` | Record creation time |
| `updated_at` | `timestamptz` | Last update time |

### Table: `linkedin_credentials`

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `organization_urn` | `text` | AWAD's LinkedIn Org URN |
| `access_token` | `text` | Encrypted OAuth token |
| `refresh_token` | `text` | Encrypted refresh token |
| `expires_at` | `timestamptz` | Token expiry |

---

## 5. API Route Map

| Route | Method | Epic | Description |
|---|---|---|---|
| `/api/generate-topic-ideas` | POST | 1 | Returns 3–4 AI topic suggestions |
| `/api/generate-draft` | POST | 2 | RAG pipeline → Gemini text generation |
| `/api/generate-image` | POST | 2 | Image generation (HF or Imagen 3) |
| `/api/refine-draft` | POST | 3 | AI-based text refinement |
| `/api/approve-post` | POST | 4 | Diff → embed → save to Vector DB |
| `/api/publish-to-linkedin` | POST | 4 | Immediate publish to LinkedIn API |
| `/api/schedule-post` | POST | 4 | Save post with scheduled timestamp |
| `/api/cron/publish-scheduled` | POST | 5 | Cron: publish all due posts |
| `/api/auth/linkedin/callback` | GET | 4 | LinkedIn OAuth 2.0 callback |

---

## 6. Tech Dependencies

```json
{
  "dependencies": {
    "next": "^14",
    "@supabase/supabase-js": "latest",
    "@supabase/auth-helpers-nextjs": "latest",
    "@google/generative-ai": "latest",
    "@pinecone-database/pinecone": "latest",
    "diff": "latest",
    "date-fns": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "tailwindcss": "latest",
    "eslint": "latest"
  }
}
```

---

## 7. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Gemini AI
GEMINI_API_KEY=

# Vector DB (Pinecone)
PINECONE_API_KEY=
PINECONE_INDEX_NAME=

# Image Generation
HUGGINGFACE_API_KEY=

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=

# Cron Security
CRON_SECRET=
```

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gemini API rate limits | Medium | High | Exponential backoff + caching topic ideas |
| LinkedIn OAuth token expiry | Medium | High | Implement refresh token rotation |
| Vector DB free tier limits | Low | Medium | Deduplicate before inserting embeddings |
| Image generation latency | High | Medium | Run concurrently with text generation; show skeleton loader |
| Vercel cold starts on cron | Low | Low | Lightweight cron endpoint with no heavy imports |
