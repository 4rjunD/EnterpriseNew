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

  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?error=github_not_configured`)
  }

  const redirectUri = `${getBaseUrl()}/api/integrations/github/callback`
  const state = session.user.organizationId

  const authUrl = new URL('https://github.com/login/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'repo read:org read:user')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
