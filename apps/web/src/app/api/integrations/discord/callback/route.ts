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

  const redirectPath = returnTo === 'onboarding' ? '/onboarding' : '/dashboard?card=integrations'
  const separator = returnTo === 'onboarding' ? '?' : '&'

  try {
    await DiscordClient.handleOAuthCallback(code, organizationId)
    return NextResponse.redirect(`${baseUrl}${redirectPath}${separator}success=discord_connected`)
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}${redirectPath}${separator}error=discord_failed`)
  }
}
