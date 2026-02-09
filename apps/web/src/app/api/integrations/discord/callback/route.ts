import { NextRequest, NextResponse } from 'next/server'
import { DiscordClient } from '@nexflow/integrations/discord'

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
    await DiscordClient.handleOAuthCallback(code, state)
    return NextResponse.redirect(
      new URL('/dashboard?card=integrations&success=discord_connected', req.url)
    )
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?card=integrations&error=discord_failed', req.url)
    )
  }
}
