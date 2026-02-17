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
        organizationId: this.organizationId, // Link to organization
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
        organizationId: this.organizationId, // Ensure org link on update too
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

  /**
   * List all repositories the authenticated user has access to.
   * Used for repository selection UI.
   */
  async listUserRepositories(): Promise<Array<{
    id: number
    owner: string
    name: string
    fullName: string
    description: string | null
    url: string
    language: string | null
    defaultBranch: string
    isPrivate: boolean
    stars: number
    updatedAt: string
  }>> {
    const client = await this.getClient()

    try {
      // Fetch user's repos (including org repos they have access to)
      const repos: Array<{
        id: number
        owner: { login: string }
        name: string
        full_name: string
        description: string | null
        html_url: string
        language: string | null
        default_branch: string
        private: boolean
        stargazers_count: number
        pushed_at: string | null
      }> = []

      // Use pagination to get all repos
      for await (const response of client.paginate.iterator(
        client.repos.listForAuthenticatedUser,
        { per_page: 100, sort: 'pushed' }
      )) {
        repos.push(...response.data)
        // Limit to 200 repos to avoid too many API calls
        if (repos.length >= 200) break
      }

      return repos.map(repo => ({
        id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        stars: repo.stargazers_count,
        updatedAt: repo.pushed_at || new Date().toISOString(),
      }))
    } catch (e) {
      console.error('Failed to list repositories:', e)
      throw e
    }
  }

  /**
   * Fetch recent commit history for a repository.
   * Returns commit metadata for velocity and pattern analysis.
   */
  async getCommitHistory(owner: string, repo: string, options?: {
    since?: string  // ISO date
    perPage?: number
  }): Promise<Array<{
    sha: string
    message: string
    author: string | null
    date: string
    additions: number
    deletions: number
    filesChanged: number
  }>> {
    const client = await this.getClient()

    try {
      const since = options?.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const perPage = options?.perPage || 100

      const { data: commits } = await client.repos.listCommits({
        owner,
        repo,
        since,
        per_page: perPage,
      })

      return commits.map(c => ({
        sha: c.sha,
        message: (c.commit.message || '').split('\n')[0].slice(0, 200),
        author: c.commit.author?.name || c.author?.login || null,
        date: c.commit.author?.date || new Date().toISOString(),
        additions: 0, // Not available in list endpoint
        deletions: 0,
        filesChanged: 0,
      }))
    } catch (e) {
      console.error(`Failed to fetch commits for ${owner}/${repo}:`, e)
      return []
    }
  }

  /**
   * Analyze commit patterns across selected repos.
   * Returns aggregated metrics for AI predictions.
   */
  async analyzeCommitPatterns(repos: Array<{ fullName: string }>): Promise<{
    totalCommits: number
    commitsPerDay: number
    activeContributors: number
    recentActivity: 'high' | 'medium' | 'low' | 'none'
    commitsByDay: Record<string, number>
    topContributors: Array<{ name: string; commits: number }>
    commitPatterns: {
      fixCommits: number
      featureCommits: number
      refactorCommits: number
      docsCommits: number
      afterHoursCommits: number
      weekendCommits: number
    }
    velocityTrend: 'accelerating' | 'stable' | 'decelerating'
    repoBreakdown: Array<{
      repo: string
      commits: number
      lastCommitDate: string
      topFiles: string[]
    }>
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const allCommits: Array<{ message: string; author: string | null; date: string; repo: string }> = []

    for (const repo of repos.slice(0, 10)) { // Limit to 10 repos
      const [owner, name] = repo.fullName.split('/')
      if (!owner || !name) continue

      const commits = await this.getCommitHistory(owner, name, { since: thirtyDaysAgo, perPage: 100 })
      allCommits.push(...commits.map(c => ({ ...c, repo: repo.fullName })))
    }

    if (allCommits.length === 0) {
      return {
        totalCommits: 0,
        commitsPerDay: 0,
        activeContributors: 0,
        recentActivity: 'none',
        commitsByDay: {},
        topContributors: [],
        commitPatterns: { fixCommits: 0, featureCommits: 0, refactorCommits: 0, docsCommits: 0, afterHoursCommits: 0, weekendCommits: 0 },
        velocityTrend: 'stable',
        repoBreakdown: [],
      }
    }

    // Commits per day
    const commitsByDay: Record<string, number> = {}
    const contributorMap = new Map<string, number>()
    const patterns = { fixCommits: 0, featureCommits: 0, refactorCommits: 0, docsCommits: 0, afterHoursCommits: 0, weekendCommits: 0 }
    const repoMap = new Map<string, { commits: number; lastDate: string }>()

    for (const commit of allCommits) {
      // Day bucket
      const day = commit.date.split('T')[0]
      commitsByDay[day] = (commitsByDay[day] || 0) + 1

      // Contributors
      if (commit.author) {
        contributorMap.set(commit.author, (contributorMap.get(commit.author) || 0) + 1)
      }

      // Message patterns
      const msg = commit.message.toLowerCase()
      if (msg.match(/\b(fix|bug|patch|hotfix|resolve)\b/)) patterns.fixCommits++
      if (msg.match(/\b(feat|feature|add|implement|new)\b/)) patterns.featureCommits++
      if (msg.match(/\b(refactor|cleanup|clean up|reorganize|restructure)\b/)) patterns.refactorCommits++
      if (msg.match(/\b(doc|readme|comment|changelog)\b/)) patterns.docsCommits++

      // Time patterns
      const commitDate = new Date(commit.date)
      const hour = commitDate.getUTCHours()
      if (hour < 7 || hour > 20) patterns.afterHoursCommits++
      const dayOfWeek = commitDate.getUTCDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) patterns.weekendCommits++

      // Repo breakdown
      const repoEntry = repoMap.get(commit.repo) || { commits: 0, lastDate: '' }
      repoEntry.commits++
      if (!repoEntry.lastDate || commit.date > repoEntry.lastDate) repoEntry.lastDate = commit.date
      repoMap.set(commit.repo, repoEntry)
    }

    // Velocity trend: compare first half vs second half
    const sortedDays = Object.keys(commitsByDay).sort()
    const midpoint = Math.floor(sortedDays.length / 2)
    const firstHalf = sortedDays.slice(0, midpoint).reduce((sum, d) => sum + (commitsByDay[d] || 0), 0)
    const secondHalf = sortedDays.slice(midpoint).reduce((sum, d) => sum + (commitsByDay[d] || 0), 0)
    const velocityTrend = secondHalf > firstHalf * 1.2 ? 'accelerating' : secondHalf < firstHalf * 0.8 ? 'decelerating' : 'stable'

    const commitsPerDay = allCommits.length / 30
    const recentActivity = commitsPerDay >= 5 ? 'high' : commitsPerDay >= 1 ? 'medium' : commitsPerDay > 0 ? 'low' : 'none'

    const topContributors = Array.from(contributorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, commits]) => ({ name, commits }))

    const repoBreakdown = Array.from(repoMap.entries())
      .map(([repo, data]) => ({
        repo,
        commits: data.commits,
        lastCommitDate: data.lastDate,
        topFiles: [],
      }))
      .sort((a, b) => b.commits - a.commits)

    return {
      totalCommits: allCommits.length,
      commitsPerDay: Math.round(commitsPerDay * 10) / 10,
      activeContributors: contributorMap.size,
      recentActivity,
      commitsByDay,
      topContributors,
      commitPatterns: patterns,
      velocityTrend,
      repoBreakdown,
    }
  }
}
