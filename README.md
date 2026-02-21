# AWAD AI Content Engine

> **Internal portal** for the AWAD team to generate, refine, and schedule LinkedIn Company Page posts using a RAG-powered AI pipeline with a built-in learning loop.

## Quick Start

1. **Fill in `.env.local`** — replace all placeholder values (see below)
2. **Run the Supabase migration** — paste `supabase/migrations/001_initial_schema.sql` into the Supabase SQL Editor
3. **Create a Pinecone index** — name it `awad-content`, 768 dimensions, cosine metric
4. **Install & run:**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables (`.env.local`)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project Settings → API |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) |
| `PINECONE_API_KEY` | [Pinecone Console](https://app.pinecone.io/) |
| `PINECONE_INDEX_NAME` | Your Pinecone index name (`awad-content`) |
| `HUGGINGFACE_API_KEY` | [HuggingFace Settings](https://huggingface.co/settings/tokens) |
| `LINKEDIN_CLIENT_ID` | [LinkedIn Developer Portal](https://developer.linkedin.com/) |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer Portal |
| `LINKEDIN_REDIRECT_URI` | `http://localhost:3000/api/auth/linkedin/callback` |
| `CRON_SECRET` | Any random string (e.g. `openssl rand -hex 32`) |

---

## User Flow

```
Generate Post button
       │
       ▼
Topic Selection (AI chips or custom input)
       │
       ▼
RAG Pipeline: embed → Pinecone → Gemini Pro + Image gen
       │
       ▼
Post Editor: edit text + image, refine with AI
       │
       ▼
Approve → Learning loop (diff → style rules → Pinecone)
       │
       ├─► Publish Now  → LinkedIn API → Published
       └─► Schedule     → Supabase → Cron → Published
```

## Architecture

| Layer | Technology |
|---|---|
| Frontend & Hosting | Vercel + Next.js 14 (App Router) |
| Backend | Next.js API Routes (serverless) |
| Database & Auth | Supabase (Free Tier) |
| Vector DB | Pinecone (Free Tier, 768-dim) |
| AI Text | Google Gemini 1.5 Pro/Flash |
| AI Embeddings | Gemini text-embedding-004 |
| AI Images | Hugging Face Inference (Stable Diffusion XL) |
| Scheduling | Vercel Cron + GitHub Actions fallback |

## Deployment

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Set all env vars in Vercel Dashboard
4. `vercel.json` already configures the hourly cron job
5. Set `CRON_SECRET` in Vercel Dashboard + GitHub Actions Secrets
