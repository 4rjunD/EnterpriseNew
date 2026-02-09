import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@nexflow/database'
import { SlackClient } from '@nexflow/integrations'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/integrations/slack
 * Get Slack integration status for current organization
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_type: {
          organizationId: session.user.organizationId,
          type: 'SLACK',
        },
      },
    })

    if (!integration) {
      return NextResponse.json({
        connected: false,
        status: 'DISCONNECTED',
      })
    }

    // Get additional team info if connected
    let teamInfo = null
    if (integration.status === 'CONNECTED') {
      const metadata = integration.metadata as { teamName?: string; teamId?: string } | null
      teamInfo = {
        teamName: metadata?.teamName,
        teamId: metadata?.teamId,
      }
    }

    return NextResponse.json({
      connected: integration.status === 'CONNECTED',
      status: integration.status,
      teamInfo,
      lastSyncAt: integration.lastSyncAt,
      syncError: integration.syncError,
    })
  } catch (error) {
    console.error('Error fetching Slack integration status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Slack integration status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/slack
 * Initiate Slack OAuth flow
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Slack is configured
    if (!process.env.SLACK_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Slack integration is not configured' },
        { status: 503 }
      )
    }

    // Generate a state token that includes the organization ID
    const state = Buffer.from(
      JSON.stringify({
        organizationId: session.user.organizationId,
        timestamp: Date.now(),
      })
    ).toString('base64url')

    const oauthUrl = SlackClient.getOAuthUrl(state)

    return NextResponse.json({
      oauthUrl,
    })
  } catch (error) {
    console.error('Error initiating Slack OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Slack OAuth' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations/slack
 * Disconnect Slack integration
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const slackClient = new SlackClient(session.user.organizationId)
    await slackClient.disconnect()

    return NextResponse.json({
      success: true,
      message: 'Slack disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting Slack:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Slack' },
      { status: 500 }
    )
  }
}
