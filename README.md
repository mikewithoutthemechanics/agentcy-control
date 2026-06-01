# Agentcy Control

A comprehensive mission control platform for managing applications, projects, and clients across your agency. Built with Next.js 14, Supabase, and Groq AI.

## Architecture

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Tremor
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **AI**: Groq API (Llama 3 8B/70B, Mixtral 8x7B) for Copilot
- **Cache/Queue**: Redis (Upstash or self-hosted)
- **Monorepo**: Turborepo + pnpm

## Project Structure

```
agentcy-control/
├── apps/
│   ├── mission-control/      # Main dashboard (port 3000)
│   │   ├── app/
│   │   │   ├── auth/         # Login/signup
│   │   │   ├── dashboard/    # Overview, deployments, incidents, analytics,
│   │   │   │               # costs, monitoring, logs, plugins, automation,
│   │   │   │               # on-call, team, security
│   │   │   ├── projects/     # Project list + create
│   │   │   └── integrations/ # Service connection manager
│   │   ├── components/
│   │   │   ├── DashboardShell.tsx  # Sidebar layout
│   │   │   └── Copilot.tsx          # AI Copilot chat (Groq-powered)
│   │   └── middleware.ts     # Auth session refresh
│   └── client-portal/        # White-label client portal (port 3001)
├── packages/
│   ├── ui/                   # Shared UI components
│   ├── shared/               # Types, constants, utilities
│   └── supabase/             # Supabase SSR clients + generated types
├── supabase/
│   ├── migrations/             # Database migrations
│   │   ├── 20240531000000_core_schema.sql      # Phases 1-5
│   │   └── 20240531000001_phase6_advanced.sql  # Phase 6
│   ├── functions/
│   │   ├── ingest/vercel/    # Vercel deployment webhooks
│   │   ├── ingest/sentry/     # Sentry error webhooks
│   │   ├── ingest/posthog/   # PostHog event webhooks
│   │   └── copilot/          # Groq AI Copilot Edge Function
│   ├── seed/
│   │   └── seed.sql          # Demo data
│   └── config.toml           # Local Supabase config
```

## Features by Phase

### Phase 1: Foundation
- [x] Turborepo monorepo structure
- [x] Multi-tenant Supabase schema (agencies, clients, projects, RBAC)
- [x] Auth with Supabase (email/password, magic links)
- [x] Mission Control dashboard with sidebar navigation
- [x] Service Integration Manager (13 services)
- [x] Client portal scaffold

### Phase 2: Mission Control Core
- [x] Global Operations Dashboard (fleet health, quick stats)
- [x] Deployments tracker (Vercel webhook ingestion)
- [x] Incidents management with SEV levels
- [x] Analytics overview (PostHog insights)
- [x] Unified event ingestion (Sentry, Vercel, PostHog, Supabase)
- [x] Alert rules and notification engine

### Phase 3: AI Copilot + Automation
- [x] **Groq AI Copilot** with tool calling (Llama 3 70B, Llama 3 8B, Mixtral)
- [x] Natural language queries: "Show me errors for Project X"
- [x] Health analysis, deployment review, cost queries
- [x] Floating chat widget with model selector (Fast/Smart/Code)
- [x] Workflow automation engine (triggers, conditions, actions)

### Phase 4: Incident Response
- [x] Incident lifecycle management (detected -> resolved)
- [x] War room creation with affected services
- [x] On-call schedules and rotations
- [x] Escalation policies
- [x] Team management and role assignments

### Phase 5: Client Portal
- [x] White-label status portal
- [x] Public uptime dashboard
- [x] Service health indicators
- [x] Incident history
- [x] Client branding support

### Phase 6: Advanced Operations
- [x] **Cost Management**: Real-time spend tracking, budget alerts, service breakdown
- [x] **Synthetic Monitoring**: HTTP/SSL/DNS/TCP/Playwright checks, multi-region
- [x] **Log Explorer**: Full-text search, filtering by source/level, trace correlation
- [x] **Plugin Marketplace**: Extensible plugin system with hooks and permissions
- [x] **Promotion Pipelines**: Configurable deployment gates and rollback
- [x] **Notification Channels**: Slack, Discord, PagerDuty, Telegram, Webhook
- [x] **Saved Dashboards**: Custom layouts and widgets

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Supabase CLI
- Docker Desktop
- Groq API key (get one at https://console.groq.com)

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start Supabase locally:**
   ```bash
   pnpm db:start
   ```

3. **Copy environment variables:**
   ```bash
   cp apps/mission-control/.env.local.example apps/mission-control/.env.local
   cp apps/client-portal/.env.local.example apps/client-portal/.env.local
   ```

   Update both `.env.local` files with your local Supabase credentials from `supabase status`.

4. **Set Edge Function secrets:**
   ```bash
   supabase secrets set GROQ_API_KEY=your-groq-api-key
   ```

5. **Run migrations and seed:**
   ```bash
   pnpm db:reset
   ```

6. **Generate types (after schema is applied):**
   ```bash
   pnpm db:types
   ```

7. **Start development:**
   ```bash
   pnpm dev
   ```

### URLs

- **Mission Control**: http://localhost:3000
- **Client Portal**: http://localhost:3001
- **Supabase Studio**: http://localhost:54323

## Groq AI Copilot

The Copilot is powered by **Groq** for ultra-fast LLM inference:

- **Fast mode**: Llama 3 8B (instant responses, lower cost)
- **Smart mode**: Llama 3 70B (complex reasoning, tool calling)
- **Code mode**: Mixtral 8x7B (technical analysis, code generation)

It uses function calling to query your live Supabase data:
- `query_projects` - Search projects and clients
- `query_events` - Query Sentry/Vercel/PostHog events
- `get_project_health` - Comprehensive health summaries
- `get_cost_summary` - Spending analysis
- `suggest_action` - Propose remediation steps

## CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration and deployment.

### Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `.github/workflows/ci.yml` | PR + push to main/develop | Lint, typecheck, build both apps, test migrations |
| **CD** | `.github/workflows/cd.yml` | push to main + manual | Deploy apps + Edge Functions + apply DB migrations |
| **Supabase** | `.github/workflows/supabase.yml` | Changes to `supabase/**` | Lint migrations, deploy Edge Functions, set secrets |

### Required Secrets

Configure these in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token (for CLI) |
| `SUPABASE_PROJECT_ID` | Your Supabase project reference ID |
| `GROQ_API_KEY` | Groq API key for Copilot |
| `ENCRYPTION_MASTER_KEY` | 32-byte key for service config encryption |

**Optional deployment secrets** (configure based on your hosting platform):

| Secret | Platform |
|--------|----------|
| `VERCEL_TOKEN` | Vercel |
| `VERCEL_ORG_ID` | Vercel |
| `VERCEL_PROJECT_ID_MC` | Vercel (mission-control) |
| `VERCEL_PROJECT_ID_CP` | Vercel (client-portal) |
| `RAILWAY_TOKEN` | Railway |
| `NETLIFY_AUTH_TOKEN` | Netlify |
| `NETLIFY_SITE_ID_MC` | Netlify (mission-control) |

### Deploying

**Staging (auto-deploy on push to main):**
```
git push origin main
```

**Production (manual):**
```
# Via GitHub UI: Actions > CD > Run workflow > Environment: production
```

### Local CI Simulation

```bash
# Run the same checks as CI locally
pnpm lint
pnpm typecheck
pnpm build

# Test migrations
pnpm db:reset
```

## Tech Stack Integrations

| Service | Integration | Status |
|---------|-------------|--------|
| Supabase | Native (DB, Auth, Realtime, Edge Functions) | Core |
| Vercel | REST API + Webhooks | Ingestion + Deployments |
| Sentry | REST API + Webhooks | Error tracking |
| PostHog | API + Event capture | Analytics |
| Resend | REST API | Transactional email |
| Redis | Direct TCP | Cache + Sessions |
| Groq | REST API | AI Copilot |
| GitHub | REST API | Source control |
| Stripe | REST API | Billing |
| Cloudflare | REST API | DNS + CDN |
| Linear | REST API | Ticketing (via plugin) |
| Slack | Webhooks | Notifications (via plugin) |
| PagerDuty | REST API | Paging (via plugin) |

## License

Private - All rights reserved.
