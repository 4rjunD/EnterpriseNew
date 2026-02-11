import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@nexflow/database'

export const dynamic = 'force-dynamic'

const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://nexflow-web-rse3.onrender.com'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const baseUrl = getBaseUrl()

  // Check if user is logged in at all
  if (!session?.user?.email) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  // Get organizationId - try session first, then DB
  let organizationId = session.user.organizationId
  if (!organizationId) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    })
    organizationId = dbUser?.organizationId || null
  }

  if (!organizationId) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_organization`)
  }

  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=discord_not_configured`)
  }

  const referer = req.headers.get('referer') || ''
  const returnTo = referer.includes('/onboarding') ? 'onboarding' : 'dashboard'

  const redirectUri = `${baseUrl}/api/integrations/discord/callback`

  const stateData = {
    organizationId,
    returnTo,
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

  const scopes = ['bot', 'guilds', 'identify'].join(' ')

  const authUrl = new URL('https://discord.com/api/oauth2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('permissions', '2048')

  return NextResponse.redirect(authUrl.toString())
}
