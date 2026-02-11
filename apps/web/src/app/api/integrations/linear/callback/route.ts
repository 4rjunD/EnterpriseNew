import { NextRequest, NextResponse } from 'next/server'
import { LinearClient } from '@nexflow/integrations/linear'

export const dynamic = 'force-dynamic'

const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'https://nexflow-web-rse3.onrender.com'
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // Contains organizationId

  if (!code || !state) {
    return NextResponse.redirect(
      `${getBaseUrl()}/dashboard?error=missing_params`
    )
  }

  try {
    await LinearClient.handleOAuthCallback(code, state)
    return NextResponse.redirect(
      `${getBaseUrl()}/dashboard?card=integrations&success=linear_connected`
    )
  } catch (error) {
    console.error('Linear OAuth error:', error)
    return NextResponse.redirect(
      `${getBaseUrl()}/dashboard?card=integrations&error=linear_failed`
    )
  }
}
