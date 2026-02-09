import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@nexflow/database'
import { TwilioClient } from '@nexflow/integrations'
import { authOptions } from '@/lib/auth'

const twilioClient = new TwilioClient()

/**
 * POST /api/user/preferences/notifications/verify-phone
 * Send a verification code to the user's phone number
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

    // Get user's phone number from preferences
    const preferences = await prisma.userNotificationPreferences.findUnique({
      where: { userId: session.user.id },
    })

    if (!preferences?.phoneNumber) {
      return NextResponse.json(
        { error: 'No phone number configured. Please add a phone number first.' },
        { status: 400 }
      )
    }

    if (preferences.phoneVerified) {
      return NextResponse.json(
        { error: 'Phone number is already verified' },
        { status: 400 }
      )
    }

    // Rate limiting: check if we've sent a code recently (1 minute cooldown)
    const lastVerificationAttempt = (preferences as { lastVerificationAttempt?: Date })
      .lastVerificationAttempt
    if (lastVerificationAttempt) {
      const cooldownMs = 60 * 1000 // 1 minute
      const timeSinceLastAttempt = Date.now() - new Date(lastVerificationAttempt).getTime()
      if (timeSinceLastAttempt < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastAttempt) / 1000)
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code` },
          { status: 429 }
        )
      }
    }

    // Send verification code via Twilio
    const result = await twilioClient.sendVerificationCode(preferences.phoneNumber)

    if (result.status !== 'pending') {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      phoneNumber: maskPhoneNumber(preferences.phoneNumber),
    })
  } catch (error) {
    console.error('Error sending verification code:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}

/**
 * Mask phone number for display (e.g., +1******7890)
 */
function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) return phone
  return phone.slice(0, 2) + '*'.repeat(phone.length - 6) + phone.slice(-4)
}
