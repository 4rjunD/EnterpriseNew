export { appRouter, type AppRouter } from './router'
export { createContext, type Context } from './trpc'
export { router, publicProcedure, protectedProcedure, managerProcedure, adminProcedure } from './trpc'

// Re-export routers for direct access
export * from './routers/dashboard'
export * from './routers/tasks'
export * from './routers/team'
export * from './routers/bottlenecks'
export * from './routers/predictions'
export * from './routers/integrations'
export * from './routers/agents'
export * from './routers/projects'
