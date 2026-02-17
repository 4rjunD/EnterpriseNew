import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '../trpc'
import { prisma, IntegrationType, IntegrationStatus } from '@nexflow/database'
import { GitHubClient, LinearClient, DiscordClient, GitHubRepoAnalyzer } from '@nexflow/integrations'
import { AutonomousAnalyzer, BottleneckDetector, PredictionEngine } from '@nexflow/ai'

const integrationInfo: Record<string, { name: string; description: string; icon: string }> = {
  LINEAR: { name: 'Linear', description: 'Issue tracking', icon: 'linear' },
  GITHUB: { name: 'GitHub', description: 'Code repository', icon: 'github' },
  JIRA: { name: 'Jira', description: 'Issue tracking', icon: 'jira' },
  NOTION: { name: 'Notion', description: 'Documentation', icon: 'notion' },
  SLACK: { name: 'Slack', description: 'Team communication', icon: 'slack' },
  DISCORD: { name: 'Discord', description: 'Team communication', icon: 'discord' },
}

const allIntegrationTypes: IntegrationType[] = ['LINEAR', 'GITHUB', 'JIRA', 'NOTION', 'SLACK', 'DISCORD']

export const integrationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const connected = await prisma.integration.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { type: 'asc' },
    })

    const connectedTypes = new Set(connected.map(i => i.type))
    const available = allIntegrationTypes
      .filter(type => !connectedTypes.has(type))
      .map(type => ({
        type,
        status: 'DISCONNECTED' as IntegrationStatus,
        ...integrationInfo[type],
      }))

    return {
      connected: connected.map(i => ({
        id: i.id,
        type: i.type,
        status: i.status,
        ...integrationInfo[i.type],
        lastSyncAt: i.lastSyncAt,
        syncError: i.syncError,
      })),
      available,
    }
  }),

  get: adminProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ ctx, input }) => {
      const integration = await prisma.integration.findFirst({
        where: {
          organizationId: ctx.organizationId,
          type: input.type as IntegrationType,
        },
      })

      if (!integration) return null

      return {
        id: integration.id,
        type: integration.type,
        status: integration.status,
        ...integrationInfo[integration.type],
        lastSyncAt: integration.lastSyncAt,
        syncError: integration.syncError,
        metadata: integration.metadata,
      }
    }),

  initOAuth: adminProcedure
    .input(z.object({ type: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const state = ctx.organizationId

      switch (input.type) {
        case 'GITHUB': {
          const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID!,
            redirect_uri: `${baseUrl}/api/integrations/github/callback`,
            scope: 'repo,read:user,read:org',
            state,
          })
          return { authUrl: `https://github.com/login/oauth/authorize?${params}` }
        }
        case 'LINEAR': {
          const params = new URLSearchParams({
            client_id: process.env.LINEAR_CLIENT_ID!,
            redirect_uri: `${baseUrl}/api/integrations/linear/callback`,
            scope: 'read,write',
            response_type: 'code',
            state,
            actor: 'application',
            prompt: 'consent',
          })
          return { authUrl: `https://linear.app/oauth/authorize?${params}` }
        }
        case 'DISCORD': {
          const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID!,
            redirect_uri: `${baseUrl}/api/integrations/discord/callback`,
            scope: 'identify guilds bot messages.read',
            response_type: 'code',
            state,
          })
          return { authUrl: `https://discord.com/api/oauth2/authorize?${params}` }
        }
        default: {
          return { authUrl: `https://oauth.example.com?provider=${input.type}` }
        }
      }
    }),

  disconnect: adminProcedure
    .input(z.object({ type: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.integration.delete({
        where: {
          organizationId_type: {
            organizationId: ctx.organizationId,
            type: input.type as IntegrationType,
          },
        },
      })
      return { success: true }
    }),

  triggerSync: adminProcedure
    .input(z.object({ type: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Set to SYNCING
      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: ctx.organizationId,
            type: input.type as IntegrationType,
          },
        },
        data: {
          status: 'SYNCING',
        },
      })

      try {
        let result: { success: boolean; itemsSynced: number }

        switch (input.type) {
          case 'GITHUB': {
            const client = new GitHubClient(ctx.organizationId)
            result = await client.sync()
            break
          }
          case 'LINEAR': {
            const client = new LinearClient(ctx.organizationId)
            result = await client.sync()
            break
          }
          case 'DISCORD': {
            const client = new DiscordClient(ctx.organizationId)
            result = await client.sync()
            break
          }
          default:
            // For integrations without sync (Slack, Notion, etc.), just mark as synced
            result = { success: true, itemsSynced: 0 }
            // Update status to CONNECTED for non-sync integrations
            await prisma.integration.update({
              where: {
                organizationId_type: {
                  organizationId: ctx.organizationId,
                  type: input.type as IntegrationType,
                },
              },
              data: {
                status: 'CONNECTED',
                lastSyncAt: new Date(),
                syncError: null,
              },
            })
        }

        // Sync clients update status themselves, but ensure it's set
        await prisma.integration.update({
          where: {
            organizationId_type: {
              organizationId: ctx.organizationId,
              type: input.type as IntegrationType,
            },
          },
          data: {
            status: 'CONNECTED',
            lastSyncAt: new Date(),
            syncError: null,
          },
        })

        return { success: result.success, itemsSynced: result.itemsSynced }
      } catch (e) {
        await prisma.integration.update({
          where: {
            organizationId_type: {
              organizationId: ctx.organizationId,
              type: input.type as IntegrationType,
            },
          },
          data: {
            status: 'ERROR',
            syncError: String(e),
          },
        })
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Sync failed: ${String(e)}`,
        })
      }
    }),

  // List available GitHub repositories for selection
  listGithubRepos: protectedProcedure.query(async ({ ctx }) => {
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: ctx.organizationId,
        type: 'GITHUB',
        status: { in: ['CONNECTED', 'SYNCING'] },
      },
    })

    if (!integration || !integration.accessToken) {
      return []
    }

    try {
      const client = new GitHubClient(ctx.organizationId)
      const repos = await client.listUserRepositories()
      return repos
    } catch (e) {
      console.error('Failed to list GitHub repos:', e)
      return []
    }
  }),

  // Sync all connected integrations at once
  syncAll: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all connected or syncing integrations (include SYNCING to fix stuck ones)
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { in: ['CONNECTED', 'SYNCING', 'ERROR'] },
      },
    })

    const results: Array<{ type: string; success: boolean; itemsSynced: number; error?: string }> = []

    for (const integration of integrations) {
      try {
        let result: { success: boolean; itemsSynced: number }

        switch (integration.type) {
          case 'GITHUB': {
            const client = new GitHubClient(ctx.organizationId)
            result = await client.sync()
            break
          }
          case 'LINEAR': {
            const client = new LinearClient(ctx.organizationId)
            result = await client.sync()
            break
          }
          case 'DISCORD': {
            const client = new DiscordClient(ctx.organizationId)
            result = await client.sync()
            break
          }
          default:
            // Skip integrations without sync capability but mark as connected
            result = { success: true, itemsSynced: 0 }
            await prisma.integration.update({
              where: {
                organizationId_type: {
                  organizationId: ctx.organizationId,
                  type: integration.type,
                },
              },
              data: {
                status: 'CONNECTED',
                syncError: null,
              },
            })
        }

        // Ensure status is CONNECTED after successful sync
        await prisma.integration.update({
          where: {
            organizationId_type: {
              organizationId: ctx.organizationId,
              type: integration.type,
            },
          },
          data: {
            status: 'CONNECTED',
            lastSyncAt: new Date(),
            syncError: null,
          },
        })

        results.push({
          type: integration.type,
          success: result.success,
          itemsSynced: result.itemsSynced,
        })
      } catch (e) {
        // Mark as error but continue with other integrations
        await prisma.integration.update({
          where: {
            organizationId_type: {
              organizationId: ctx.organizationId,
              type: integration.type,
            },
          },
          data: {
            status: 'ERROR',
            syncError: String(e),
          },
        })

        results.push({
          type: integration.type,
          success: false,
          itemsSynced: 0,
          error: String(e),
        })
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.itemsSynced, 0)
    const allSuccess = results.every((r) => r.success)

    // If GitHub was synced, trigger autonomous analysis in background
    const githubResult = results.find((r) => r.type === 'GITHUB' && r.success)
    let analysisTriggered = false
    if (githubResult) {
      // Run analysis asynchronously (don't await)
      runAutonomousAnalysisInBackground(ctx.organizationId).catch((e) => {
        console.error('Background analysis failed:', e)
      })
      analysisTriggered = true
    }

    return {
      success: allSuccess,
      totalItemsSynced: totalSynced,
      results,
      analysisTriggered,
    }
  }),
})

// Background analysis function
async function runAutonomousAnalysisInBackground(organizationId: string) {
  try {
    // Analyze repos
    const repoAnalyzer = new GitHubRepoAnalyzer(organizationId)
    const repoAnalyses = await repoAnalyzer.analyzeAllRepos()

    // Generate insights
    const autonomousAnalyzer = new AutonomousAnalyzer(organizationId)
    await autonomousAnalyzer.analyzeAndGenerate(repoAnalyses)

    // Run bottleneck detection
    const detector = new BottleneckDetector(organizationId)
    await detector.runDetection()

    // Run predictions
    const engine = new PredictionEngine({ organizationId })
    await engine.runAllPredictions()

    console.log(`Autonomous analysis completed for org ${organizationId}`)
  } catch (e) {
    console.error(`Autonomous analysis failed for org ${organizationId}:`, e)
  }
}

export type IntegrationsRouter = typeof integrationsRouter
