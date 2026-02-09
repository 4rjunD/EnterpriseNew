import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DiscordClient } from '@nexflow/integrations/discord'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = new DiscordClient(session.user.organizationId)
  const isConnected = await client.isConnected()

  return NextResponse.json({ connected: isConnected })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await req.json()

  const client = new DiscordClient(session.user.organizationId)

  switch (action) {
    case 'sync':
      const result = await client.sync()
      return NextResponse.json(result)

    case 'disconnect':
      await client.disconnect()
      return NextResponse.json({ success: true })

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
