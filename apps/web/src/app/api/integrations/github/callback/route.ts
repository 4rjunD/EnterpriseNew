import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient } from '@nexflow/integrations/github'

export const dynamic = 'force-dynamic'

const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://nexflow-web-rse3.onrender.com'
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl()
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=missing_params`)
  }

  let organizationId: string
  let returnTo = 'onboarding'

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    organizationId = stateData.organizationId
    returnTo = stateData.returnTo || 'onboarding'
  } catch {
    organizationId = state
  }

  // For onboarding, redirect back to integrations step
  const redirectPath = returnTo === 'onboarding'
    ? '/onboarding?step=integrations'
    : '/dashboard?card=integrations'

  try {
    await GitHubClient.handleOAuthCallback(code, organizationId)

    // Trigger immediate sync after successful OAuth
    try {
      const client = new GitHubClient(organizationId)
      const syncResult = await client.sync()
      console.log(`GitHub sync completed: ${syncResult.itemsSynced} items synced`)
    } catch (syncError) {
      console.error('GitHub initial sync failed (non-blocking):', syncError)
      // Don't fail the OAuth flow if sync fails - it will retry later
    }

    return NextResponse.redirect(`${baseUrl}${redirectPath}&success=github_connected`)
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}${redirectPath}&error=github_failed`)
  }
}
