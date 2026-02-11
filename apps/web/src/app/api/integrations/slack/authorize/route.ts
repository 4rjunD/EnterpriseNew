import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://nexflow-web-rse3.onrender.com'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const baseUrl = getBaseUrl()

  if (!session?.user?.organizationId) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  const clientId = process.env.SLACK_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=slack_not_configured`)
  }

  const referer = req.headers.get('referer') || ''
  const returnTo = referer.includes('/onboarding') ? 'onboarding' : 'dashboard'

  const redirectUri = `${baseUrl}/api/integrations/slack/callback`

  const stateData = {
    organizationId: session.user.organizationId,
    timestamp: Date.now(),
    returnTo,
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

  const scopes = [
    'channels:read',
    'chat:write',
    'im:write',
    'users:read',
    'users:read.email',
  ].join(',')

  const authUrl = new URL('https://slack.com/oauth/v2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
