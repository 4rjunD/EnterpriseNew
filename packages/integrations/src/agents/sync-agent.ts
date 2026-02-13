/**
 * Integration Sync Agent
 *
 * Orchestrates data scraping from connected integrations.
 * Each integration type has its own sync frequency and data points.
 */

import { prisma, IntegrationType, IntegrationStatus } from '@nexflow/database'
import { GitHubClient } from '../github/client'
import { LinearClient } from '../linear/client'
import { SlackClient } from '../slack/client'
import type { IntegrationClient, SyncResult } from '../types'

// Sync frequency in milliseconds per provider
export const SYNC_FREQUENCIES: Record<IntegrationType, number> = {
  GITHUB: 5 * 60 * 1000,      // 5 minutes
  LINEAR: 5 * 60 * 1000,      // 5 minutes
  SLACK: 5 * 60 * 1000,       // 5 minutes (or real-time via webhook)
  DISCORD: 5 * 60 * 1000,     // 5 minutes
  JIRA: 5 * 60 * 1000,        // 5 minutes
  GOOGLE_CALENDAR: 15 * 60 * 1000, // 15 minutes
  NOTION: 15 * 60 * 1000,     // 15 minutes
}

// Data points scraped per provider
export const PROVIDER_DATA_POINTS: Record<IntegrationType, string[]> = {
  GITHUB: ['commits', 'prs', 'reviews', 'branches', 'ci_status', 'revert_rate'],
  LINEAR: ['issues', 'sprints', 'cycles', 'estimates', 'completions'],
  SLACK: ['messages', 'channels', 'response_times', 'threads'],
  DISCORD: ['messages', 'channels', 'voice_activity', 'threads'],
  JIRA: ['tickets', 'sprints', 'backlog', 'estimation_accuracy'],
  GOOGLE_CALENDAR: ['meetings', 'focus_time', 'scheduling_patterns'],
  NOTION: ['docs', 'wikis', 'notes', 'collaboration_frequency'],
}

/**
 * Get the appropriate client for an integration type
 */
function getClientForType(type: IntegrationType, organizationId: string): IntegrationClient | null {
  switch (type) {
    case IntegrationType.GITHUB:
      return new GitHubClient(organizationId)
    case IntegrationType.LINEAR:
      return new LinearClient(organizationId)
    case IntegrationType.SLACK:
      return new SlackClient(organizationId)
    // Add more clients as they're implemented
    default:
      return null
  }
}

/**
 * Check if an integration needs syncing based on its frequency
 */
function needsSync(lastSyncAt: Date | null, type: IntegrationType): boolean {
  if (!lastSyncAt) return true
  const frequency = SYNC_FREQUENCIES[type]
  return Date.now() - lastSyncAt.getTime() > frequency
}

/**
 * Sync a single integration
 */
export async function syncIntegration(
  organizationId: string,
  type: IntegrationType
): Promise<SyncResult> {
  const client = getClientForType(type, organizationId)

  if (!client) {
    return {
      success: false,
      itemsSynced: 0,
      errors: [`No client implemented for ${type}`],
    }
  }

  try {
    // Mark as syncing
    await prisma.integration.update({
      where: {
        organizationId_type: {
          organizationId,
          type,
        },
      },
      data: {
        status: IntegrationStatus.SYNCING,
      },
    })

    // Perform the sync
    const result = await client.sync()

    // Update status
    await prisma.integration.update({
      where: {
        organizationId_type: {
          organizationId,
          type,
        },
      },
      data: {
        status: result.success ? IntegrationStatus.CONNECTED : IntegrationStatus.ERROR,
        lastSyncAt: new Date(),
        syncError: result.errors?.join('; ') || null,
      },
    })

    return result
  } catch (error) {
    await prisma.integration.update({
      where: {
        organizationId_type: {
          organizationId,
          type,
        },
      },
      data: {
        status: IntegrationStatus.ERROR,
        syncError: String(error),
      },
    })

    return {
      success: false,
      itemsSynced: 0,
      errors: [String(error)],
    }
  }
}

/**
 * Sync all integrations for an organization
 */
export async function syncAllIntegrations(organizationId: string): Promise<Map<IntegrationType, SyncResult>> {
  const integrations = await prisma.integration.findMany({
    where: {
      organizationId,
      status: IntegrationStatus.CONNECTED,
    },
  })

  const results = new Map<IntegrationType, SyncResult>()

  for (const integration of integrations) {
    if (needsSync(integration.lastSyncAt, integration.type)) {
      const result = await syncIntegration(organizationId, integration.type)
      results.set(integration.type, result)
    }
  }

  return results
}

/**
 * Sync all connected integrations across all organizations
 * This is meant to be called by a cron job or scheduler
 */
export async function syncAllOrganizations(): Promise<void> {
  const integrations = await prisma.integration.findMany({
    where: {
      status: IntegrationStatus.CONNECTED,
    },
    select: {
      organizationId: true,
      type: true,
      lastSyncAt: true,
    },
  })

  // Group by organization
  const byOrg = new Map<string, typeof integrations>()
  for (const integration of integrations) {
    const list = byOrg.get(integration.organizationId) || []
    list.push(integration)
    byOrg.set(integration.organizationId, list)
  }

  // Sync each organization's integrations
  for (const [organizationId, orgIntegrations] of byOrg) {
    for (const integration of orgIntegrations) {
      if (needsSync(integration.lastSyncAt, integration.type)) {
        try {
          await syncIntegration(organizationId, integration.type)
        } catch (error) {
          console.error(`Failed to sync ${integration.type} for org ${organizationId}:`, error)
        }
      }
    }
  }
}

/**
 * Store raw integration event data
 */
export async function storeIntegrationData(
  organizationId: string,
  provider: IntegrationType,
  eventType: string,
  data: Record<string, unknown>,
  userIdentifier?: string,
  eventAt?: Date,
  memberId?: string
): Promise<void> {
  await prisma.integrationData.create({
    data: {
      organizationId,
      provider,
      eventType,
      data,
      userIdentifier,
      eventAt,
      memberId,
    },
  })
}

/**
 * Get recent integration data for analysis
 */
export async function getRecentIntegrationData(
  organizationId: string,
  provider?: IntegrationType,
  days: number = 30
): Promise<unknown[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return prisma.integrationData.findMany({
    where: {
      organizationId,
      ...(provider ? { provider } : {}),
      eventAt: {
        gte: since,
      },
    },
    orderBy: {
      eventAt: 'desc',
    },
    take: 1000, // Limit for performance
  })
}
