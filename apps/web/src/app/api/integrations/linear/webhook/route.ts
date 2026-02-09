import { NextRequest, NextResponse } from 'next/server'
import { handleLinearWebhook, verifyWebhookSignature } from '@nexflow/integrations/linear'
import { prisma } from '@nexflow/database'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('linear-signature') || ''

  // Find organization by webhook
  const payload = JSON.parse(body)

  // Linear webhooks include organizationId
  const linearOrgId = payload.organizationId

  // Find our integration by matching Linear org
  const integration = await prisma.integration.findFirst({
    where: {
      type: 'LINEAR',
      metadata: {
        path: ['linearOrganizationId'],
        equals: linearOrgId,
      },
    },
  })

  if (!integration) {
    // Try to find by webhook secret
    const allLinearIntegrations = await prisma.integration.findMany({
      where: { type: 'LINEAR' },
    })

    for (const int of allLinearIntegrations) {
      if (int.webhookSecret) {
        const isValid = await verifyWebhookSignature(body, signature, int.webhookSecret)
        if (isValid) {
          await handleLinearWebhook(payload, int.organizationId)
          return NextResponse.json({ success: true })
        }
      }
    }

    return NextResponse.json({ error: 'Unknown webhook source' }, { status: 400 })
  }

  if (integration.webhookSecret) {
    const isValid = await verifyWebhookSignature(body, signature, integration.webhookSecret)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  await handleLinearWebhook(payload, integration.organizationId)

  return NextResponse.json({ success: true })
}
