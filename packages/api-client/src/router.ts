import { router } from './trpc'
import { dashboardRouter } from './routers/dashboard'
import { tasksRouter } from './routers/tasks'
import { teamRouter } from './routers/team'
import { bottlenecksRouter } from './routers/bottlenecks'
import { predictionsRouter } from './routers/predictions'
import { integrationsRouter } from './routers/integrations'
import { agentsRouter } from './routers/agents'
import { projectsRouter } from './routers/projects'
import { onboardingRouter } from './routers/onboarding'
import { invitationsRouter } from './routers/invitations'
import { syncRouter } from './routers/sync'
import { contextRouter } from './routers/context'
import { progressRouter } from './routers/progress'
import { calendarRouter } from './routers/calendar'
import { agentChatRouter } from './routers/agent-chat'
import { analysisRouter } from './routers/analysis'
import { repositoriesRouter } from './routers/repositories'
import { knowledgeBaseRouter } from './routers/knowledge-base'

export const appRouter = router({
  dashboard: dashboardRouter,
  tasks: tasksRouter,
  team: teamRouter,
  bottlenecks: bottlenecksRouter,
  predictions: predictionsRouter,
  integrations: integrationsRouter,
  agents: agentsRouter,
  projects: projectsRouter,
  onboarding: onboardingRouter,
  invitations: invitationsRouter,
  sync: syncRouter,
  context: contextRouter,
  progress: progressRouter,
  calendar: calendarRouter,
  agentChat: agentChatRouter,
  analysis: analysisRouter,
  repositories: repositoriesRouter,
  knowledgeBase: knowledgeBaseRouter,
})

export type AppRouter = typeof appRouter
