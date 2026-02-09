# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NexFlow Enterprise is an AI-powered engineering management platform that detects bottlenecks, predicts delivery risks, and provides agentic automation for team management. Built as a monorepo using Turborepo with pnpm workspaces.

## Common Commands

```bash
# Development
pnpm dev                    # Start all apps in development mode
pnpm dev --filter @nexflow/web  # Start only the web app

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:push               # Push schema to database
pnpm db:migrate            # Run migrations
pnpm db:studio             # Open Prisma Studio
pnpm --filter @nexflow/database seed  # Seed demo data

# Build & Quality
pnpm build                  # Build all packages
pnpm lint                   # Lint all packages
pnpm typecheck             # Type check all packages
pnpm format                # Format with Prettier

# Docker
docker-compose up -d        # Start PostgreSQL and Redis
```

## Architecture

### Monorepo Structure

```
apps/
  web/          # Next.js 14 app (App Router) - main dashboard
  electron/     # Desktop app wrapper
  worker/       # Background job processor

packages/
  api-client/   # tRPC router definitions and procedures
  database/     # Prisma schema and client (@nexflow/database)
  ui/           # Shared Radix-based components (@nexflow/ui)
  ai/           # AI agents and bottleneck detection (@nexflow/ai)
  integrations/ # External service clients (Linear, GitHub, Jira, Slack, etc.)
  config/       # Shared configuration
```

### Key Patterns

**tRPC API Layer** (`packages/api-client/`)
- Routers: `dashboard`, `tasks`, `team`, `bottlenecks`, `predictions`, `integrations`, `agents`, `projects`
- Procedure levels: `publicProcedure`, `protectedProcedure`, `managerProcedure`, `adminProcedure`
- Demo mode flag in `trpc.ts` bypasses auth for development

**Frontend** (`apps/web/`)
- Next.js App Router with route groups: `(auth)` for login, `(dashboard)` for main app
- tRPC client at `src/lib/trpc.ts` - use `trpc.useUtils()` for cache invalidation
- UI components import from `@nexflow/ui/*` (e.g., `@nexflow/ui/button`)
- Component folders mirror feature domains: `bottlenecks/`, `tasks/`, `team/`, `projects/`

**AI Agents** (`packages/ai/`)
- `AgentBase` abstract class for all agents
- Concrete agents: `TaskReassignerAgent`, `NudgeSenderAgent`, `ScopeAdjusterAgent`
- `BottleneckDetector` identifies issues from task/PR data
- Agents create `AgentAction` records with status `PENDING` for async execution

**Database** (`packages/database/`)
- PostgreSQL with Prisma ORM
- Key models: `Organization`, `User`, `Team`, `Project`, `Task`, `PullRequest`, `Bottleneck`, `AgentConfig`, `AgentAction`
- User roles: `ADMIN`, `MANAGER`, `IC`
- Enums exported from `@nexflow/database` (e.g., `TaskStatus`, `BottleneckSeverity`)

### Data Flow

1. External integrations (Linear, GitHub, etc.) sync to local database
2. `BottleneckDetector` analyzes data and creates `Bottleneck` records
3. Dashboard queries via tRPC show health scores, bottlenecks, predictions
4. User actions trigger `AgentAction` records (PENDING status)
5. Worker processes pending actions and executes them (e.g., send Slack nudge)

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Required for auth
- Integration credentials as needed (Linear, Slack, etc.)

Start local services: `docker-compose up -d` (PostgreSQL on 5432, Redis on 6379)

## Common Gotchas

- Radix UI Select requires non-empty string values - use `"none"` instead of `""`
- Date fields from Prisma may be strings on client - always wrap in `new Date()` before formatting
- When adding new tRPC routers, register them in `packages/api-client/src/router.ts`
- UI components use `@nexflow/ui/*` path imports, not barrel exports
- The `toast()` function is imported from `@nexflow/ui/toast`
