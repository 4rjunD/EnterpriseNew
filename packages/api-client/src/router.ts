import { router } from './trpc'
import { dashboardRouter } from './routers/dashboard'
import { tasksRouter } from './routers/tasks'
import { teamRouter } from './routers/team'
import { bottlenecksRouter } from './routers/bottlenecks'
import { predictionsRouter } from './routers/predictions'
import { integrationsRouter } from './routers/integrations'
import { agentsRouter } from './routers/agents'
import { projectsRouter } from './routers/projects'

export const appRouter = router({
  dashboard: dashboardRouter,
  tasks: tasksRouter,
  team: teamRouter,
  bottlenecks: bottlenecksRouter,
  predictions: predictionsRouter,
  integrations: integrationsRouter,
  agents: agentsRouter,
  projects: projectsRouter,
})

export type AppRouter = typeof appRouter
