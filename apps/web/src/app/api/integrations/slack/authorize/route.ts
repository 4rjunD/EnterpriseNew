import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://nexflow-web-rse3.onrender.com'
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.organizationId) {
    return NextResponse.redirect(`${getBaseUrl()}/login`)
  }

  const clientId = process.env.SLACK_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?error=slack_not_configured`)
  }

  const redirectUri = `${getBaseUrl()}/api/integrations/slack/callback`

  // Encode state with org ID and timestamp
  const stateData = {
    organizationId: session.user.organizationId,
    timestamp: Date.now(),
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
