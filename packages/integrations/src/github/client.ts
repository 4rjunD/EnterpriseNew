import { Octokit } from '@octokit/rest'
import { prisma, IntegrationType, PRStatus, CIStatus } from '@nexflow/database'
import type { IntegrationClient, SyncResult, UnifiedPullRequest, OAuthTokens } from '../types'

export class GitHubClient implements IntegrationClient {
  type = IntegrationType.GITHUB
  private octokit: Octokit | null = null
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private async getClient(): Promise<Octokit> {
    if (this.octokit) return this.octokit

    const integration = await prisma.integration.findUnique({
      where: {
        organizationId_type: {
          organizationId: this.organizationId,
          type: IntegrationType.GITHUB,
        },
      },
    })

    if (!integration?.accessToken) {
      throw new Error('GitHub integration not connected')
    }

    this.octokit = new Octokit({ auth: integration.accessToken })
    return this.octokit
  }

  async isConnected(): Promise<boolean> {
    try {
      const client = await this.getClient()
      await client.users.getAuthenticated()
      return true
    } catch {
      return false
    }
  }

  async sync(): Promise<SyncResult> {
    const client = await this.getClient()
    let itemsSynced = 0
    const errors: string[] = []

    try {
      // Get repositories the user has access to
      const { data: repos } = await client.repos.listForAuthenticatedUser({
        sort: 'pushed',
        per_page: 50,
      })

      for (const repo of repos) {
        try {
          // Fetch open pull requests
          const { data: prs } = await client.pulls.list({
            owner: repo.owner.login,
            repo: repo.name,
            state: 'all',
            per_page: 50,
          })

          for (const pr of prs) {
            const unifiedPR = this.mapToUnifiedPR(pr, repo.full_name)
            await this.upsertPullRequest(unifiedPR)
            itemsSynced++
          }
        } catch (e) {
          errors.push(`Failed to sync repo ${repo.full_name}: ${e}`)
        }
      }

      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: IntegrationType.GITHUB,
          },
        },
        data: {
          lastSyncAt: new Date(),
          syncError: null,
          status: 'CONNECTED',
        },
      })

      return { success: true, itemsSynced, errors: errors.length > 0 ? errors : undefined }
    } catch (e) {
      await prisma.integration.update({
        where: {
          organizationId_type: {
            organizationId: this.organizationId,
            type: IntegrationType.GITHUB,
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
          type: IntegrationType.GITHUB,
        },
      },
      data: {
        accessToken: null,
        refreshToken: null,
        webhookId: null,
        status: 'DISCONNECTED',
      },
    })
    this.octokit = null
  }

  static async handleOAuthCallback(
    code: string,
    organizationId: string
  ): Promise<OAuthTokens> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error_description || 'OAuth failed')
    }

    await prisma.integration.upsert({
      where: {
        organizationId_type: {
          organizationId,
          type: IntegrationType.GITHUB,
        },
      },
      create: {
        organizationId,
        type: IntegrationType.GITHUB,
        accessToken: data.access_token,
        status: 'CONNECTED',
      },
      update: {
        accessToken: data.access_token,
        status: 'CONNECTED',
      },
    })

    return { accessToken: data.access_token }
  }

  private mapToUnifiedPR(
    pr: {
      id: number
      number: number
      title: string
      body?: string | null
      state: string
      draft?: boolean
      additions?: number
      deletions?: number
      user?: { email?: string | null } | null
      html_url: string
      base: { ref: string }
      head: { ref: string }
      created_at: string
      merged_at?: string | null
      closed_at?: string | null
    },
    repository: string
  ): UnifiedPullRequest {
    return {
      externalId: String(pr.id),
      number: pr.number,
      title: pr.title,
      description: pr.body || undefined,
      status: pr.state === 'open' ? 'OPEN' : pr.merged_at ? 'MERGED' : 'CLOSED',
      url: pr.html_url,
      isDraft: pr.draft || false,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      authorEmail: pr.user?.email || undefined,
      repository,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      createdAt: new Date(pr.created_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
    }
  }

  private async upsertPullRequest(pr: UnifiedPullRequest): Promise<void> {
    let authorId: string | undefined
    if (pr.authorEmail) {
      const user = await prisma.user.findFirst({
        where: {
          email: pr.authorEmail,
          organizationId: this.organizationId,
        },
      })
      authorId = user?.id
    }

    await prisma.pullRequest.upsert({
      where: { externalId: pr.externalId },
      create: {
        externalId: pr.externalId,
        number: pr.number,
        title: pr.title,
        description: pr.description,
        status: pr.status as PRStatus,
        url: pr.url,
        isDraft: pr.isDraft,
        additions: pr.additions,
        deletions: pr.deletions,
        authorId,
        repository: pr.repository,
        baseBranch: pr.baseBranch,
        headBranch: pr.headBranch,
        mergedAt: pr.mergedAt,
        closedAt: pr.closedAt,
        lastSyncedAt: new Date(),
        lastActivityAt: new Date(),
      },
      update: {
        title: pr.title,
        description: pr.description,
        status: pr.status as PRStatus,
        isDraft: pr.isDraft,
        additions: pr.additions,
        deletions: pr.deletions,
        mergedAt: pr.mergedAt,
        closedAt: pr.closedAt,
        lastSyncedAt: new Date(),
      },
    })
  }

  async getCheckStatus(owner: string, repo: string, ref: string): Promise<CIStatus> {
    const client = await this.getClient()

    try {
      const { data } = await client.checks.listForRef({
        owner,
        repo,
        ref,
      })

      if (data.total_count === 0) return CIStatus.UNKNOWN

      const hasFailure = data.check_runs.some(
        (run) => run.conclusion === 'failure'
      )
      const hasPending = data.check_runs.some(
        (run) => run.status === 'in_progress' || run.status === 'queued'
      )

      if (hasFailure) return CIStatus.FAILING
      if (hasPending) return CIStatus.PENDING
      return CIStatus.PASSING
    } catch {
      return CIStatus.UNKNOWN
    }
  }
}
