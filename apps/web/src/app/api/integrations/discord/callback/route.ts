import { NextRequest, NextResponse } from 'next/server'
import { DiscordClient } from '@nexflow/integrations/discord'

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
    await DiscordClient.handleOAuthCallback(code, state)
    return NextResponse.redirect(`${baseUrl}/dashboard?card=integrations&success=discord_connected`)
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/dashboard?card=integrations&error=discord_failed`)
  }
}
