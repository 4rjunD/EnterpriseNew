import { router, protectedProcedure } from '../trpc'
import { prisma } from '@nexflow/database'

export const onboardingRouter = router({
  // Get onboarding status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { onboardingCompleted: true },
    })
    return { completed: user?.onboardingCompleted ?? false }
  }),

  // Mark onboarding as complete
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { onboardingCompleted: true },
    })
    return { success: true }
  }),
})
