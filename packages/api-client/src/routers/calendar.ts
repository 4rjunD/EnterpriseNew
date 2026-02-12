import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@nexflow/database'

// Calendar integration skeleton for future Google Calendar integration
export const calendarRouter = router({
  // Get user's calendar sync preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const preference = await prisma.calendarSyncPreference.findUnique({
      where: { userId: ctx.userId },
    })

    return (
      preference || {
        preferredFocusHours: 4,
        focusStartTime: '09:00',
        focusEndTime: '17:00',
        autoBlockEnabled: false,
      }
    )
  }),

  // Update calendar sync preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        preferredFocusHours: z.number().min(1).max(8).optional(),
        focusStartTime: z.string().optional(),
        focusEndTime: z.string().optional(),
        autoBlockEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.calendarSyncPreference.upsert({
        where: { userId: ctx.userId },
        update: input,
        create: {
          userId: ctx.userId,
          ...input,
        },
      })
    }),

  // Get focus time blocks for a date range
  getFocusBlocks: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      return prisma.focusTimeBlock.findMany({
        where: {
          userId: ctx.userId,
          startTime: { gte: input.startDate },
          endTime: { lte: input.endDate },
        },
        orderBy: { startTime: 'asc' },
      })
    }),

  // Create a focus time block
  createFocusBlock: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        startTime: z.date(),
        endTime: z.date(),
        type: z.enum(['DEEP_WORK', 'MEETING', 'BREAK']),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.focusTimeBlock.create({
        data: {
          userId: ctx.userId,
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          type: input.type,
          reason: input.reason,
        },
      })
    }),

  // Update a focus time block
  updateFocusBlock: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return prisma.focusTimeBlock.update({
        where: { id, userId: ctx.userId },
        data,
      })
    }),

  // Delete a focus time block
  deleteFocusBlock: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.focusTimeBlock.delete({
        where: { id: input.id, userId: ctx.userId },
      })
      return { success: true }
    }),

  // Get weekly schedule overview
  getWeeklySchedule: protectedProcedure
    .input(
      z
        .object({
          weekStart: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const weekStart = input?.weekStart || getStartOfWeek(new Date())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const blocks = await prisma.focusTimeBlock.findMany({
        where: {
          userId: ctx.userId,
          startTime: { gte: weekStart },
          endTime: { lte: weekEnd },
        },
        orderBy: { startTime: 'asc' },
      })

      // Group by day
      const byDay: Record<string, typeof blocks> = {}
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart)
        day.setDate(day.getDate() + i)
        byDay[day.toISOString().split('T')[0]] = []
      }

      for (const block of blocks) {
        const dayKey = block.startTime.toISOString().split('T')[0]
        if (byDay[dayKey]) {
          byDay[dayKey].push(block)
        }
      }

      // Calculate stats
      const totalFocusMinutes = blocks
        .filter((b) => b.type === 'DEEP_WORK')
        .reduce(
          (sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60),
          0
        )

      const meetingMinutes = blocks
        .filter((b) => b.type === 'MEETING')
        .reduce(
          (sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60),
          0
        )

      return {
        weekStart,
        weekEnd,
        blocks,
        byDay,
        stats: {
          totalFocusHours: Math.round(totalFocusMinutes / 60 * 10) / 10,
          totalMeetingHours: Math.round(meetingMinutes / 60 * 10) / 10,
          focusBlockCount: blocks.filter((b) => b.type === 'DEEP_WORK').length,
          meetingCount: blocks.filter((b) => b.type === 'MEETING').length,
        },
      }
    }),

  // Check integration status (skeleton - will connect to Google Calendar)
  getIntegrationStatus: protectedProcedure.query(async ({ ctx }) => {
    const integration = await prisma.integration.findFirst({
      where: {
        organization: {
          users: { some: { id: ctx.userId } },
        },
        type: 'GOOGLE_CALENDAR',
      },
    })

    return {
      connected: integration?.status === 'CONNECTED',
      lastSyncAt: integration?.lastSyncAt,
      error: integration?.syncError,
    }
  }),
})

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export type CalendarRouter = typeof calendarRouter
