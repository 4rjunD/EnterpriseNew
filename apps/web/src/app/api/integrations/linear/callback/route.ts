import { NextRequest, NextResponse } from 'next/server'
import { LinearClient } from '@nexflow/integrations/linear'

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

  // Decode state to get organizationId and returnTo
  let organizationId: string
  let returnTo = 'onboarding'

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    organizationId = stateData.organizationId
    returnTo = stateData.returnTo || 'onboarding'
  } catch {
    // Fallback: state might be just the organizationId (old format)
    organizationId = state
  }

  const redirectPath = returnTo === 'onboarding' ? '/onboarding' : '/dashboard?card=integrations'

  try {
    await LinearClient.handleOAuthCallback(code, organizationId)
    return NextResponse.redirect(`${baseUrl}${redirectPath}&success=linear_connected`)
  } catch (error) {
    console.error('Linear OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}${redirectPath}&error=linear_failed`)
  }
}
