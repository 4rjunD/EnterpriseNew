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

  const clientId = process.env.LINEAR_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?error=linear_not_configured`)
  }

  const redirectUri = `${getBaseUrl()}/api/integrations/linear/callback`
  const state = session.user.organizationId

  const authUrl = new URL('https://linear.app/oauth/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'read,write,issues:create,comments:create')
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
