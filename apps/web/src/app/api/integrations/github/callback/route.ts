import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient } from '@nexflow/integrations/github'
import { GuaranteedAnalyzer } from '@nexflow/ai'

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

    // Ensure dashboard has content (baseline tasks, predictions, etc.)
    try {
      const guaranteedAnalyzer = new GuaranteedAnalyzer(organizationId)
      const result = await guaranteedAnalyzer.ensureContent()
      console.log(`Guaranteed content generated: ${result.tasksCreated} tasks, ${result.bottlenecksCreated} bottlenecks, ${result.predictionsCreated} predictions`)
    } catch (analyzerError) {
      console.error('Guaranteed analyzer failed (non-blocking):', analyzerError)
      // Don't fail - dashboard will still work, just maybe empty initially
    }

    // Add showRepoSelection flag to prompt user to select repos
    return NextResponse.redirect(`${baseUrl}${redirectPath}&success=github_connected&showRepoSelection=true`)
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}${redirectPath}&error=github_failed`)
  }
}
