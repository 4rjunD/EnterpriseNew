import { NextRequest, NextResponse } from 'next/server'
import { LinearClient } from '@nexflow/integrations/linear'

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
    await LinearClient.handleOAuthCallback(code, state)
    return NextResponse.redirect(
      new URL('/dashboard?card=integrations&success=linear_connected', req.url)
    )
  } catch (error) {
    console.error('Linear OAuth error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?card=integrations&error=linear_failed', req.url)
    )
  }
}
