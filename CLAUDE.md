# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NexFlow Enterprise is an AI-powered engineering management platform that detects bottlenecks, predicts delivery risks, and provides agentic automation for team management. Built as a monorepo using Turborepo with pnpm workspaces.

## Common Commands

```bash
# Development
pnpm dev                              # Start all apps in development mode
pnpm dev --filter @nexflow/web        # Start only the web app

# Database
pnpm db:generate                      # Generate Prisma client
pnpm db:push                          # Push schema to database (dev)
pnpm db:migrate                       # Run migrations (production)
pnpm db:studio                        # Open Prisma Studio
pnpm --filter @nexflow/database seed  # Seed demo data

# Build & Quality
pnpm build                            # Build all packages
pnpm lint                             # Lint all packages
pnpm typecheck                        # Type check all packages
pnpm format                           # Format with Prettier

# Docker (local development)
docker-compose up -d                  # Start PostgreSQL and Redis
```

## Architecture

### Monorepo Structure

```
apps/
  web/              # Next.js 14 (App Router) - main dashboard
  worker/           # BullMQ background job processor

packages/
  api-client/       # tRPC router definitions (@nexflow/api-client)
  database/         # Prisma schema and client (@nexflow/database)
  ui/               # Shared Radix-based components (@nexflow/ui)
  ai/               # AI agents, chat system, autonomous analysis (@nexflow/ai)
  integrations/     # External service clients (@nexflow/integrations)
```

### tRPC API Layer (`packages/api-client/`)

Routers are defined in `src/routers/` and registered in `src/router.ts`:
- `dashboard`, `tasks`, `team`, `projects` - Core CRUD operations
- `bottlenecks`, `predictions`, `analysis` - AI-powered insights
- `integrations`, `sync`, `repositories` - External service connections and repo selection
- `agentChat` - Conversational AI interface
- `onboarding`, `invitations` - User management
- `knowledgeBase`, `context`, `progress`, `calendar` - Organization intelligence

Procedure authorization levels in `src/trpc.ts`:
- `publicProcedure` - No auth required
- `protectedProcedure` - Any authenticated user
- `managerProcedure` - ADMIN or MANAGER role
- `adminProcedure` - ADMIN only

### Frontend (`apps/web/`)

Route groups in `src/app/`:
- `(auth)/` - Login, signup, forgot-password, reset-password
- `(dashboard)/` - Main app (requires auth + completed onboarding)
- `(onboarding)/` - Multi-step setup wizard
- `api/` - REST endpoints for auth, integrations, user management

Key files:
- `src/lib/auth.ts` - NextAuth configuration (Google, GitHub, Credentials)
- `src/lib/trpc.ts` - tRPC client setup
- `src/middleware.ts` - Route protection and role-based access

### AI System (`packages/ai/`)

**AgentCore** (`src/agent/core.ts`):
- Claude-powered conversational agent using Anthropic SDK
- Memory persistence via `MemoryManager`
- Context awareness via `ContextBuilder`
- 11 skills in `src/agent/skills/`: create-task, send-nudge, analyze-risks, etc.

**Autonomous Analyzers** (`src/autonomous/`):
- `analyzer.ts` - Analyzes GitHub repos to generate tasks, bottlenecks, predictions
- `context-analyzer.ts` - Generates AI insights from company context (no repo required)
- `guaranteed-analyzer.ts` - Ensures dashboard never empty, creates baseline content
- All use Claude to interpret data and suggest improvements

**Legacy Agents** (`src/agents/`):
- `TaskReassignerAgent`, `NudgeSenderAgent`, `ScopeAdjusterAgent`
- Create `AgentAction` records (status: PENDING) for async execution

### Integrations (`packages/integrations/`)

Each integration follows the same pattern:
- OAuth flow via `handleOAuthCallback()` static method
- `sync()` method to pull data into local database
- Credentials stored in `Integration` model with `accessToken`, `refreshToken`

Supported: GitHub, Linear, Jira, Slack, Discord, Notion, Google Calendar

Email via Resend (`src/email/`): password reset, verification, invitations, nudges

### Database (`packages/database/`)

Prisma schema at `prisma/schema.prisma`. Key models:
- `Organization` - Multi-tenant root, all data scoped to org
- `User` - Auth, roles (ADMIN/MANAGER/IC), onboarding state
- `Task`, `PullRequest` - Synced from integrations with `organizationId`
- `Integration` - OAuth tokens and sync state per org
- `AgentConversation`, `AgentMessage`, `AgentMemory` - Chat system
- `PasswordResetToken`, `EmailVerificationToken` - Self-serve auth
- `ProjectContext` - Company context (industry, stage, goals, challenges, risk tolerance)
- `SelectedRepository` - Repos chosen for tracking with cached metrics
- `OrganizationKnowledgeBase` - AI-generated insights, risks, recommendations

### Data Flow

1. User connects integration → OAuth callback stores tokens in `Integration`
2. User selects repos to track → stored in `SelectedRepository`
3. Sync runs → Tasks/PRs created with `organizationId` and `source` field
4. `AutonomousAnalyzer` generates insights via Claude from repo analysis
5. `ContextBasedAnalyzer` generates insights from company context (fallback when no repos)
6. `GuaranteedAnalyzer` ensures baseline content always exists
7. Dashboard displays via tRPC queries scoped to user's organization
8. AI chat uses `AgentCore` with skills that can modify data

### Dashboard Tabs

Tabs are configured per team type in `apps/web/src/lib/theme.ts`:
- **Today** - Unified view: tasks, PRs, predictions, bottlenecks, risks, recommendations
- **Predictions** - AI-generated delivery forecasts
- **Team** - Members and pending invitations
- **Context** - Editable project context (what you're building, company profile, milestones)
- **Milestones** - Progress tracking toward goals
- **Integrations** - Connected services (GitHub, Linear, Slack, etc.)
- **Risks** - Active bottlenecks and risk indicators

## Environment Variables

Required in `.env`:
```
DATABASE_URL          # PostgreSQL connection (pooled)
DIRECT_URL            # PostgreSQL direct connection (migrations)
NEXTAUTH_SECRET       # Session encryption
NEXTAUTH_URL          # App base URL

# OAuth (optional but recommended)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

# Integrations
LINEAR_CLIENT_ID, LINEAR_CLIENT_SECRET
DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN
SLACK_CLIENT_ID, SLACK_CLIENT_SECRET

# Services
ANTHROPIC_API_KEY     # Claude AI
RESEND_API_KEY        # Transactional email
REDIS_URL             # BullMQ job queue
```

## Common Gotchas

- Radix UI Select requires non-empty string values - use `"none"` instead of `""`
- Date fields from Prisma may be strings on client - wrap in `new Date()` before formatting
- When adding new tRPC routers, register them in `packages/api-client/src/router.ts`
- UI components use `@nexflow/ui/*` path imports (e.g., `@nexflow/ui/button`)
- The `toast()` function is imported from `@nexflow/ui/toast`
- Use `isLoading` instead of `isPending` for tRPC mutations (older tRPC version)
- For nullable fields in Prisma unique constraints, use `findFirst` + update/create instead of `upsert`
- Synced data (Tasks, PRs) must include `organizationId` to appear in dashboard
- OAuth callbacks encode `organizationId` in state parameter for multi-tenant support
- Predictions require a `Project` to exist (foreign key constraint) - create default project first
- Refresh button invalidates queries via `trpc.useUtils()` for immediate UI updates
- `getUnifiedTodos` combines tasks, PRs, predictions, bottlenecks, risks, recommendations
