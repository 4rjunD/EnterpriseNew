import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'

// Demo mode bypasses auth for UI development
// Set to false in production with proper auth
const DEMO_MODE = true

// Define UserRole locally to avoid Prisma dependency in demo mode
enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  IC = 'IC',
}

interface Context {
  userId?: string
  organizationId?: string
  role?: UserRole
}

export const createContext = (opts: { userId?: string; organizationId?: string; role?: UserRole }): Context => {
  return {
    userId: opts.userId,
    organizationId: opts.organizationId,
    role: opts.role,
  }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape
  },
})

export const router = t.router
export const publicProcedure = t.procedure

// In demo mode, all procedures skip auth checks
// Authenticated procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (DEMO_MODE) {
    return next({
      ctx: {
        userId: ctx.userId || 'demo-user',
        organizationId: ctx.organizationId || 'demo-org',
        role: ctx.role || UserRole.ADMIN,
      },
    })
  }
  if (!ctx.userId || !ctx.organizationId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      role: ctx.role,
    },
  })
})

// Manager+ procedure
export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (DEMO_MODE) return next({ ctx })
  if (ctx.role === UserRole.IC) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager access required' })
  }
  return next({ ctx })
})

// Admin procedure
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (DEMO_MODE) return next({ ctx })
  if (ctx.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({ ctx })
})

export { TRPCError }
export type { Context }
