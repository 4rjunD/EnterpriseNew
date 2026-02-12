// Schedule Meeting Skill - Suggest meeting times
// ============================================================================

import { prisma } from '@nexflow/database'
import type { Skill, SkillResult } from './types'
import type { AgentContext } from '../types'

export const scheduleMeetingSkill: Skill = {
  name: 'schedule_meeting',
  description: 'Suggest optimal meeting times based on team availability. Requires approval before sending calendar invites.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Meeting title/subject',
      },
      attendeeIds: {
        type: 'array',
        description: 'IDs of users who should attend',
        items: { type: 'string' },
      },
      durationMinutes: {
        type: 'number',
        description: 'Meeting duration in minutes (default: 30)',
      },
      purpose: {
        type: 'string',
        description: 'Purpose or agenda for the meeting',
      },
      preferredTimeRange: {
        type: 'object',
        description: 'Preferred time range for the meeting',
      },
      priority: {
        type: 'string',
        description: 'Meeting priority',
        enum: ['low', 'normal', 'high'],
      },
    },
    required: ['title', 'attendeeIds'],
  },
  requiresApproval: true,

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<SkillResult> {
    const {
      title,
      attendeeIds,
      durationMinutes = 30,
      purpose,
      preferredTimeRange,
      priority = 'normal',
    } = params as {
      title: string
      attendeeIds: string[]
      durationMinutes?: number
      purpose?: string
      preferredTimeRange?: { startTime?: string; endTime?: string; timezone?: string }
      priority?: 'low' | 'normal' | 'high'
    }

    try {
      if (attendeeIds.length === 0) {
        return { success: false, error: 'At least one attendee is required' }
      }

      // Verify all attendees exist and are in the organization
      const attendees = await prisma.user.findMany({
        where: {
          id: { in: attendeeIds },
          organizationId: context.organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          timezone: true,
          calendarPreference: true,
          focusTimeBlocks: {
            where: {
              startTime: { gte: new Date() },
              status: { not: 'CANCELLED' },
            },
            orderBy: { startTime: 'asc' },
            take: 20,
          },
        },
      })

      if (attendees.length !== attendeeIds.length) {
        const foundIds = attendees.map((a) => a.id)
        const missingIds = attendeeIds.filter((id) => !foundIds.includes(id))
        return {
          success: false,
          error: `Some attendees not found or not in organization: ${missingIds.join(', ')}`,
        }
      }

      // Find available time slots
      const suggestedSlots = findAvailableSlots(
        attendees,
        durationMinutes,
        preferredTimeRange
      )

      // Format attendee info
      const attendeeInfo = attendees.map((a) => ({
        id: a.id,
        name: a.name ?? a.email,
        email: a.email,
        timezone: a.timezone ?? 'UTC',
      }))

      return {
        success: true,
        data: {
          title,
          purpose,
          durationMinutes,
          priority,
          attendees: attendeeInfo,
          suggestedSlots: suggestedSlots.slice(0, 5),
          note: 'Calendar integration will send invites to selected slot upon approval.',
        },
        message: `Found ${suggestedSlots.length} available time slots for "${title}" with ${attendees.length} attendee(s)`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

interface Attendee {
  id: string
  name: string | null
  timezone: string | null
  calendarPreference: {
    preferredFocusHours: number
    focusStartTime: string
    focusEndTime: string
  } | null
  focusTimeBlocks: Array<{
    startTime: Date
    endTime: Date
    type: string
  }>
}

interface TimeSlot {
  startTime: string
  endTime: string
  score: number
  reason: string
}

function findAvailableSlots(
  attendees: Attendee[],
  durationMinutes: number,
  preferredTimeRange?: { startTime?: string; endTime?: string; timezone?: string }
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const now = new Date()
  const duration = durationMinutes * 60 * 1000

  // Default to next 5 business days
  const startDate = new Date(now)
  startDate.setHours(9, 0, 0, 0)
  if (startDate < now) {
    startDate.setDate(startDate.getDate() + 1)
  }

  // Skip to Monday if weekend
  while (startDate.getDay() === 0 || startDate.getDay() === 6) {
    startDate.setDate(startDate.getDate() + 1)
  }

  // Parse preferred time range
  let preferredStart = 9 // 9 AM
  let preferredEnd = 17 // 5 PM

  if (preferredTimeRange?.startTime) {
    const [hours] = preferredTimeRange.startTime.split(':').map(Number)
    if (!isNaN(hours)) preferredStart = hours
  }
  if (preferredTimeRange?.endTime) {
    const [hours] = preferredTimeRange.endTime.split(':').map(Number)
    if (!isNaN(hours)) preferredEnd = hours
  }

  // Get all busy times
  const busyTimes: Array<{ start: Date; end: Date }> = []
  for (const attendee of attendees) {
    for (const block of attendee.focusTimeBlocks) {
      if (block.type === 'MEETING') {
        busyTimes.push({
          start: new Date(block.startTime),
          end: new Date(block.endTime),
        })
      }
    }
  }

  // Check each 30-minute slot for the next 5 days
  for (let day = 0; day < 5; day++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + day)

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue

    for (let hour = preferredStart; hour < preferredEnd; hour++) {
      for (const minute of [0, 30]) {
        const slotStart = new Date(currentDate)
        slotStart.setHours(hour, minute, 0, 0)

        const slotEnd = new Date(slotStart.getTime() + duration)

        // Skip if past
        if (slotStart < now) continue

        // Skip if extends past preferred end
        if (slotEnd.getHours() > preferredEnd) continue

        // Check for conflicts
        const hasConflict = busyTimes.some(
          (busy) => slotStart < busy.end && slotEnd > busy.start
        )

        if (hasConflict) continue

        // Calculate score
        let score = 100

        // Prefer mid-morning (10-11 AM)
        if (hour >= 10 && hour < 11) {
          score += 10
        }

        // Prefer mid-afternoon (2-3 PM)
        if (hour >= 14 && hour < 15) {
          score += 5
        }

        // Avoid lunch time (12-1 PM)
        if (hour >= 12 && hour < 13) {
          score -= 20
        }

        // Avoid early morning
        if (hour < 10) {
          score -= 10
        }

        // Avoid late afternoon
        if (hour >= 16) {
          score -= 10
        }

        // Prefer sooner
        score -= day * 2

        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' })
        const timeStr = slotStart.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        let reason = `${dayName} at ${timeStr}`
        if (hour >= 10 && hour < 11) {
          reason += ' (optimal morning slot)'
        } else if (hour >= 14 && hour < 15) {
          reason += ' (optimal afternoon slot)'
        }

        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          score,
          reason,
        })
      }
    }
  }

  // Sort by score descending
  slots.sort((a, b) => b.score - a.score)

  return slots
}
