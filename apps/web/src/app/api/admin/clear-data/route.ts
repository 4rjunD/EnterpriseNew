import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@nexflow/database'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/clear-data
 * Clears all non-essential data for the organization (keeps users, org, teams)
 * Admin only
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organizationId = session.user.organizationId

  try {
    // Clear data in order (respecting foreign keys)
    await prisma.$transaction([
      // Clear notifications
      prisma.notification.deleteMany({
        where: { user: { organizationId } },
      }),
      // Clear behavioral metrics
      prisma.behavioralMetric.deleteMany({
        where: { user: { organizationId } },
      }),
      // Clear agent actions
      prisma.agentAction.deleteMany({
        where: { agentConfig: { organizationId } },
      }),
      // Clear bottlenecks
      prisma.bottleneck.deleteMany({
        where: { project: { organizationId } },
      }),
      // Clear predictions
      prisma.prediction.deleteMany({
        where: { project: { organizationId } },
      }),
      // Clear pull requests
      prisma.pullRequest.deleteMany({
        where: { project: { organizationId } },
      }),
      // Clear tasks
      prisma.task.deleteMany({
        where: { project: { organizationId } },
      }),
      // Clear projects
      prisma.project.deleteMany({
        where: { organizationId },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Data cleared successfully. Your workspace is now fresh.',
    })
  } catch (error) {
    console.error('Error clearing data:', error)
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    )
  }
}
