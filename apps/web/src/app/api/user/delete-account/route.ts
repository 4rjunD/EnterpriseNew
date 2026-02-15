import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@nexflow/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendAccountDeletedEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { password, confirmation } = await req.json()

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm account deletion' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For credential users, verify password
    if (user.password) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required to delete your account' },
          { status: 400 }
        )
      }
      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Password is incorrect' }, { status: 400 })
      }
    }

    // Soft delete - mark as deleted but keep data for compliance
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: `deleted-${user.id}@deleted.nexflow.dev`,
        name: 'Deleted User',
        password: null,
        image: null,
      },
    })

    // Send confirmation email to original address
    await sendAccountDeletedEmail(user.email, user.name || undefined)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
