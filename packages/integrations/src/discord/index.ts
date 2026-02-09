import { prisma, IntegrationType } from '@nexflow/database'
import type { IntegrationClient, SyncResult, OAuthTokens } from '../types'

export class DiscordClient implements IntegrationClient {
  type = IntegrationType.DISCORD
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private async getAccessToken(): Promise<string> {
    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: IntegrationType.DISCORD,
        },
      },
    })

    if (!integration?.accessToken) {
      throw new Error('Discord integration not connected')
    }

    return integration.accessToken
  }

  async isConnected(): Promise<boolean> {
    try {
      const token = await this.getAccessToken()
      const res = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async sync(): Promise<SyncResult> {
    const token = await this.getAccessToken()
    let itemsSynced = 0

    try {
      // Fetch the user's guilds
      const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!guildsRes.ok) {
        throw new Error('Failed to fetch guilds')
      }

      const guilds = await guildsRes.json()
      itemsSynced = guilds.length

      // Store guild info as metadata on the integration
      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: IntegrationType.DISCORD,
          },
        },
        data: {
          lastSyncAt: new Date(),
          syncError: null,
          status: 'CONNECTED',
          metadata: {
            guilds: guilds.map((g: { id: string; name: string; icon: string | null }) => ({
              id: g.id,
              name: g.name,
              icon: g.icon,
            })),
          },
        },
      })

      return { success: true, itemsSynced }
    } catch (e) {
      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: IntegrationType.DISCORD,
          },
        },
        data: {
          syncError: String(e),
          status: 'ERROR',
        },
      })
      throw e
    }
  }

  async disconnect(): Promise<void> {
    await prisma.integration.update({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: IntegrationType.DISCORD,
        },
      },
      data: {
        accessToken: null,
        refreshToken: null,
        webhookId: null,
        status: 'DISCONNECTED',
      },
    })
  }

  async sendMessage(options: {
    channelId: string
    content: string
    embeds?: unknown[]
  }): Promise<void> {
    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      throw new Error('DISCORD_BOT_TOKEN not configured')
    }

    const res = await fetch(
      `https://discord.com/api/v10/channels/${options.channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: options.content,
          embeds: options.embeds,
        }),
      }
    )

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Failed to send Discord message: ${error}`)
    }
  }

  async getGuilds(): Promise<Array<{ id: string; name: string; icon: string | null }>> {
    const token = await this.getAccessToken()
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new Error('Failed to fetch guilds')
    }

    return res.json()
  }

  async getChannels(guildId: string): Promise<Array<{ id: string; name: string; type: number }>> {
    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      throw new Error('DISCORD_BOT_TOKEN not configured')
    }

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    })

    if (!res.ok) {
      throw new Error('Failed to fetch channels')
    }

    return res.json()
  }

  static async handleOAuthCallback(
    code: string,
    organizationId: string
  ): Promise<OAuthTokens> {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const response = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/integrations/discord/callback`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Discord OAuth failed: ${errorText}`)
    }

    const data = await response.json()

    await prisma.integration.upsert({
      where: {
        organizationId_type: {
          organizationId,
          type: IntegrationType.DISCORD,
        },
      },
      create: {
        organizationId,
        type: IntegrationType.DISCORD,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
        status: 'CONNECTED',
      },
      update: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : null,
        status: 'CONNECTED',
      },
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    }
  }
}
