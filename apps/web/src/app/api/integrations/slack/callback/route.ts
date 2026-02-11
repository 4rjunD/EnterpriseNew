import { NextRequest, NextResponse } from 'next/server'
import { SlackClient } from '@nexflow/integrations'

export const dynamic = 'force-dynamic'

const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://nexflow-web-rse3.onrender.com'
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl()

  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Decode state to get returnTo
    let stateData: { organizationId: string; timestamp: number; returnTo?: string } | null = null
    let returnTo = 'onboarding'

    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
        returnTo = stateData?.returnTo || 'onboarding'
      } catch {
        // Invalid state
      }
    }

    const redirectPath = returnTo === 'onboarding' ? '/onboarding' : '/dashboard?card=integrations'
    const separator = returnTo === 'onboarding' ? '?' : '&'

    // Handle OAuth errors
    if (error) {
      console.error('Slack OAuth error:', error)
      return NextResponse.redirect(`${baseUrl}${redirectPath}${separator}error=slack_cancelled`)
    }

    if (!code || !state || !stateData) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}${separator}error=invalid_params`)
    }

    // Check state timestamp (10 minute expiry)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}${separator}error=session_expired`)
    }

    // Exchange code for token
    const result = await SlackClient.handleOAuthCallback(code, stateData.organizationId)

    if (!result.success) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}${separator}error=slack_failed`)
    }

    return NextResponse.redirect(`${baseUrl}${redirectPath}${separator}success=slack_connected`)
  } catch (error) {
    console.error('Error handling Slack OAuth callback:', error)
    return NextResponse.redirect(`${baseUrl}/onboarding?error=slack_error`)
  }
}
