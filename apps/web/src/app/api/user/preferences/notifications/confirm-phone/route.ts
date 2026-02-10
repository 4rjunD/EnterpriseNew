import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@nexflow/database'
import { TwilioClient } from '@nexflow/integrations'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const twilioClient = new TwilioClient()

const confirmCodeSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
})

/**
 * POST /api/user/preferences/notifications/confirm-phone
 * Confirm the verification code and mark phone as verified
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Twilio is configured
    if (!twilioClient.isVerifyConfigured) {
      return NextResponse.json(
        { error: 'Phone verification is not configured' },
        { status: 503 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = confirmCodeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid verification code', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { code } = validationResult.data

    // Get user's phone number from preferences
    const preferences = await prisma.userNotificationPreferences.findUnique({
      where: { userId: session.user.id },
    })

    if (!preferences?.phoneNumber) {
      return NextResponse.json(
        { error: 'No phone number configured' },
        { status: 400 }
      )
    }

    if (preferences.phoneVerified) {
      return NextResponse.json(
        { error: 'Phone number is already verified' },
        { status: 400 }
      )
    }

    // Verify the code with Twilio
    const isValid = await twilioClient.verifyCode(preferences.phoneNumber, code)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark phone as verified
    await prisma.userNotificationPreferences.update({
      where: { userId: session.user.id },
      data: {
        phoneVerified: true,
        smsEnabled: true, // Auto-enable SMS notifications after verification
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      phoneVerified: true,
    })
  } catch (error) {
    console.error('Error confirming verification code:', error)
    return NextResponse.json(
      { error: 'Failed to confirm verification code' },
      { status: 500 }
    )
  }
}
