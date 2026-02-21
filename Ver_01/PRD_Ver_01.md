# AWAD AI Content Engine — Product Requirements Document (PRD) v0.1

> **Version:** 0.1 | **Date:** 2026-02-20 | **Status:** Draft

---

## 1. Product Vision & Overview

A specialized **internal web portal** for the AWAD team to generate, manage, and schedule content for the **AWAD LinkedIn Company Page**.

The system utilizes a **Human-in-the-Loop (HITL)** approach:
- Generates posts (text + images) based on user-selected or AI-suggested topics.
- Learns from user edits over time to match AWAD's unique brand voice.
- Operates entirely on a **zero-cost cloud infrastructure**.

---

## 2. Architecture & Tech Stack (Zero-Cost Tier Focus)

| Layer | Technology | Notes |
|---|---|---|
| **Frontend & Hosting** | Vercel (Free Tier) + Next.js / React | Static + SSR |
| **Backend** | Vercel Serverless Functions (Next.js API Routes) | No dedicated server |
| **Database & Auth** | Supabase (Free Tier) | Auth, post status, metadata |
| **Vector DB** | Pinecone or Qdrant (Free Tier) | Embeddings for the learning loop |
| **Automation** | Vercel Cron Jobs or GitHub Actions (Free) | Scheduling mechanism |

---

## 3. Core Epics & User Flow

### Epic 1 — Initiation & Topic Selection (On-Demand)

> The system does **not** post autonomously. It is always triggered by the user.

1. **Trigger:** User clicks a prominent **"Generate Post"** button on the dashboard.
2. **Topic Selection Modal:** System prompts: *"What should we write about today?"*
3. **AI Suggestions:** UI displays **3–4 dynamic topic suggestions** relevant to AWAD's domains (e.g., tech news, legal tips for startups, funding trends), fetched via a lightweight Gemini API call.
4. **Manual Input:** A text field allows the user to paste a specific URL (article/news) or type a custom topic.

---

### Epic 2 — Content Generation & Context Retrieval (RAG)

1. **Loading State:** UI displays a `"Building your post..."` indicator.
2. **Context Retrieval:** Backend converts the topic into an embedding and queries the Vector DB to retrieve the **top 3 most relevant** previously approved posts and stored "lessons" (style preferences, avoided words).
3. **Generation:** Gemini API is called with the retrieved context + topic, instructed to write in AWAD's exact brand voice.
4. **Image Generation:** Concurrently, an image generation API creates an accompanying visual based on the post context.

---

### Epic 3 — Review & Refinement

Generated text and image are displayed in a **Post Editor** interface with the following actions:

| Action | Description |
|---|---|
| **Manual Edit** | Direct text editing in the text box |
| **Refine with AI** | Smaller input field for quick AI tweaks (e.g., *"Make it more professional"*, *"Remove the hashtags"*) |
| **Regenerate Image** | Request a new image if the current one is unsatisfactory |

---

### Epic 4 — Approval, Learning, and Publishing

1. **Approval:** User clicks **"Approve"**.
2. **Learning Loop Trigger:**
   - System calculates the **diff** between the original AI draft and the final approved text.
   - The polished text + inferred writing rules are **embedded and saved to the Vector DB** to improve future generations.
3. **Publishing Decision Modal:** *"When to publish?"*

| Option | Behavior |
|---|---|
| **Publish Now** | Backend sends payload to LinkedIn API → Supabase status set to `Published` → timestamp logged |
| **Schedule for Later** | User selects date/time via picker → post saved in Supabase with status `Scheduled` + target timestamp |

---

### Epic 5 — The Scheduler (Cron Job)

- A lightweight Cron Job runs **every hour** (`0 * * * *`).
- Queries Supabase for posts where `status == 'Scheduled'` AND `target_timestamp <= NOW()`.
- Pushes matching posts to the LinkedIn API and updates their status to `Published`.

---

## 4. API Integrations

### 4.1 AI Text Engine — Google Gemini API
- Source: Google AI Studio (Free Tier)
- **Critical:** Implement **exponential backoff / retry logic** to handle rate limits gracefully.

### 4.2 AI Image Engine
- **Option A:** Hugging Face Inference API (Free Tier — Stable Diffusion models)
- **Option B:** Gemini API with **Imagen 3** (if available via the same key)

### 4.3 LinkedIn Social Graph — LinkedIn v2 API
- Must be configured for a **Company Page (Organization)**.
- Required OAuth 2.0 scopes: `w_organization_social`, `rw_organization_admin`
- Must handle the full **OAuth 2.0 flow** and securely store the **AWAD Organization URN**.

---

## 5. Post State Machine

```
Draft ──► Reviewing ──► Approved ──► Scheduled ──► Published
                                  └──────────────────────────► Published (Publish Now)
```

---

## 6. Developer Instructions (for Antigravity / AI Developer)

### State Management
- Implement a clean, robust **state machine** in the UI for the Post object following the flow above.

### RAG Implementation
- Build the embedding pipeline carefully.
- The system's core value depends on how accurately it saves approved text to the Vector DB and retrieves it as a prompt prefix during subsequent generations.

### API Route Isolation
Keep Next.js API routes **modular** and single-responsibility:

| Route | Responsibility |
|---|---|
| `/api/generate-topic-ideas` | Fetch AI topic suggestions |
| `/api/generate-draft` | Run RAG pipeline + call Gemini for post text |
| `/api/generate-image` | Call image generation API |
| `/api/approve-post` | Save diff + embeddings to Vector DB |
| `/api/publish-to-linkedin` | Send post payload to LinkedIn API |
| `/api/schedule-post` | Save post with `Scheduled` status to Supabase |
| `/api/cron/publish-scheduled` | Cron endpoint to poll and publish scheduled posts |

### Security

> [!CAUTION]
> All API keys (Gemini, LinkedIn, Supabase, Vector DB) **must** be managed exclusively in `.env` files. **Never expose secrets to the frontend client.**

- Use Supabase Row-Level Security (RLS) policies to protect data.
- Validate and sanitize all user inputs on the server side before passing them to any external API.

---

## 7. Key Non-Functional Requirements

| Requirement | Detail |
|---|---|
| **Cost** | Zero-cost cloud infrastructure (all free tiers) |
| **Security** | All secrets in `.env`; never client-exposed |
| **Reliability** | Exponential backoff on all external API calls |
| **Scalability** | Serverless architecture scales to demand |
| **Auditability** | All publish events logged with timestamps in Supabase |
