import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma, UserRole } from '@nexflow/database'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(1),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, orgName } = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Create organization
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
      },
    })

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: UserRole.ADMIN,
        organizationId: organization.id,
      },
    })

    // Create default agent configs
    await prisma.agentConfig.createMany({
      data: [
        {
          organizationId: organization.id,
          type: 'TASK_REASSIGNER',
          enabled: false,
          autoApprove: false,
          thresholds: {
            overloadThreshold: 5,
            skillMatchWeight: 0.7,
            availabilityWeight: 0.3,
          },
        },
        {
          organizationId: organization.id,
          type: 'NUDGE_SENDER',
          enabled: false,
          autoApprove: false,
          thresholds: {
            reminderIntervalHours: 24,
            maxReminders: 3,
          },
          quietHours: { start: 22, end: 8 },
        },
        {
          organizationId: organization.id,
          type: 'SCOPE_ADJUSTER',
          enabled: false,
          autoApprove: false,
          thresholds: {
            scopeCreepThreshold: 0.2,
            deferralPriorityThreshold: 'MEDIUM',
          },
        },
      ],
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
