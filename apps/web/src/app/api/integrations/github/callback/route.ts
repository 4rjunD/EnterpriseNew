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
  const state = searchParams.get('state') // Contains organizationId

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard?error=missing_params`)
  }

  try {
    await GitHubClient.handleOAuthCallback(code, state)
    return NextResponse.redirect(`${baseUrl}/dashboard?card=integrations&success=github_connected`)
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/dashboard?card=integrations&error=github_failed`)
  }
}
