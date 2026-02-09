import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient } from '@nexflow/integrations/github'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // Contains organizationId

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?error=missing_params', req.url)
    )
  }

  try {
    await GitHubClient.handleOAuthCallback(code, state)
    return NextResponse.redirect(
      new URL('/dashboard?card=integrations&success=github_connected', req.url)
    )
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?card=integrations&error=github_failed', req.url)
    )
  }
}
