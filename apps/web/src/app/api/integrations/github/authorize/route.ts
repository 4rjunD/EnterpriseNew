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

  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}/onboarding?error=github_not_configured`)
  }

  const referer = req.headers.get('referer') || ''
  const returnTo = referer.includes('/onboarding') ? 'onboarding' : 'dashboard'

  const redirectUri = `${baseUrl}/api/integrations/github/callback`

  const stateData = {
    organizationId: session.user.organizationId,
    returnTo,
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

  const authUrl = new URL('https://github.com/login/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'repo read:org read:user')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
