import { NextRequest, NextResponse } from 'next/server'
import { SlackClient } from '@nexflow/integrations'

/**
 * GET /api/integrations/slack/callback
 * Handle Slack OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Slack OAuth error:', error)
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/integrations?error=${encodeURIComponent('Slack authorization was cancelled or failed')}`,
          request.url
        )
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/integrations?error=${encodeURIComponent('Invalid OAuth callback parameters')}`,
          request.url
        )
      )
    }

    // Decode and validate state
    let stateData: { organizationId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/integrations?error=${encodeURIComponent('Invalid OAuth state')}`,
          request.url
        )
      )
    }

    // Check state timestamp (10 minute expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/integrations?error=${encodeURIComponent('OAuth session expired. Please try again.')}`,
          request.url
        )
      )
    }

    // Exchange code for token
    const result = await SlackClient.handleOAuthCallback(code, stateData.organizationId)

    if (!result.success) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/integrations?error=${encodeURIComponent(result.error || 'Failed to connect Slack')}`,
          request.url
        )
      )
    }

    // Success! Redirect back to integrations page
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/integrations?success=${encodeURIComponent(`Connected to Slack workspace: ${result.teamName}`)}`,
        request.url
      )
    )
  } catch (error) {
    console.error('Error handling Slack OAuth callback:', error)
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/integrations?error=${encodeURIComponent('An unexpected error occurred')}`,
        request.url
      )
    )
  }
}
