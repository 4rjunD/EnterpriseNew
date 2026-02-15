import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexflow/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

// Verify email with token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
  }

  try {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
    }

    if (verificationToken.usedAt) {
      return NextResponse.redirect(new URL('/login?message=already_verified', req.url))
    }

    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/login?error=token_expired', req.url))
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email },
    })

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', req.url))
    }

    // Mark email as verified
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.redirect(new URL('/login?message=email_verified', req.url))
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url))
  }
}

// Resend verification email
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Delete existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { email: user.email },
    })

    // Create new token
    await prisma.emailVerificationToken.create({
      data: {
        token,
        email: user.email,
        userId: user.id,
        expiresAt,
      },
    })

    // Send email
    await sendVerificationEmail(user.email, token, user.name || undefined)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
  }
}
