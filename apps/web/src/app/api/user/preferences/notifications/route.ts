import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@nexflow/database'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'

// Schema for updating notification preferences
const updatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  slackEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  phoneNumber: z.string().optional().nullable(),
  nudgeViaSms: z.boolean().optional(),
  reassignmentViaSms: z.boolean().optional(),
  criticalOnlyViaSms: z.boolean().optional(),
  quietHours: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      timezone: z.string(),
    })
    .optional()
    .nullable(),
})

/**
 * GET /api/user/preferences/notifications
 * Get current user's notification preferences
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await prisma.userNotificationPreferences.findUnique({
      where: { userId: session.user.id },
    })

    if (!preferences) {
      // Return defaults
      return NextResponse.json({
        emailEnabled: true,
        slackEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        phoneNumber: null,
        phoneVerified: false,
        slackUserId: null,
        nudgeViaSms: true,
        reassignmentViaSms: true,
        criticalOnlyViaSms: false,
        quietHours: null,
      })
    }

    return NextResponse.json({
      emailEnabled: preferences.emailEnabled,
      slackEnabled: preferences.slackEnabled,
      smsEnabled: preferences.smsEnabled,
      inAppEnabled: preferences.inAppEnabled,
      phoneNumber: preferences.phoneNumber,
      phoneVerified: preferences.phoneVerified,
      slackUserId: preferences.slackUserId,
      nudgeViaSms: preferences.nudgeViaSms,
      reassignmentViaSms: preferences.reassignmentViaSms,
      criticalOnlyViaSms: preferences.criticalOnlyViaSms,
      quietHours: preferences.quietHours,
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/preferences/notifications
 * Update current user's notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = updatePreferencesSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // If phone number is being changed, reset verification
    const currentPrefs = await prisma.userNotificationPreferences.findUnique({
      where: { userId: session.user.id },
    })

    const phoneChanged =
      data.phoneNumber !== undefined &&
      data.phoneNumber !== currentPrefs?.phoneNumber

    const preferences = await prisma.userNotificationPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data,
        phoneVerified: false, // New record, not verified
      },
      update: {
        ...data,
        // Reset verification if phone number changed
        ...(phoneChanged && { phoneVerified: false }),
      },
    })

    return NextResponse.json({
      emailEnabled: preferences.emailEnabled,
      slackEnabled: preferences.slackEnabled,
      smsEnabled: preferences.smsEnabled,
      inAppEnabled: preferences.inAppEnabled,
      phoneNumber: preferences.phoneNumber,
      phoneVerified: preferences.phoneVerified,
      nudgeViaSms: preferences.nudgeViaSms,
      reassignmentViaSms: preferences.reassignmentViaSms,
      criticalOnlyViaSms: preferences.criticalOnlyViaSms,
      quietHours: preferences.quietHours,
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}
