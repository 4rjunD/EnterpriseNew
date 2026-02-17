import { Octokit } from '@octokit/rest'
import { prisma, IntegrationType } from '@nexflow/database'

export interface RepoAnalysis {
  repo: {
    name: string
    fullName: string
    description: string | null
    url: string
    defaultBranch: string
    language: string | null
    stars: number
    openIssues: number
    lastPush: Date
  }
  structure: {
    hasReadme: boolean
    hasTests: boolean
    hasCI: boolean
    hasDocs: boolean
    hasDocker: boolean
    hasEnvExample: boolean
    mainFolders: string[]
    fileCount: number
  }
  codeInsights: {
    todos: TodoItem[]
    fixmes: TodoItem[]
    hacks: TodoItem[]
    totalTodos: number
  }
  completeness: {
    score: number // 0-100
    missingElements: string[]
    strengths: string[]
  }
  issues: {
    open: number
    closed: number
    stale: number // open > 30 days
    bugCount: number
    featureCount: number
  }
  prs: {
    open: number
    stale: number // open > 7 days
    avgMergeTime: number | null
  }
}

export interface TodoItem {
  file: string
  line: number
  text: string
  priority: 'low' | 'medium' | 'high'
  url: string
}

export class GitHubRepoAnalyzer {
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

  /**
   * Analyze only specific selected repos (much fewer API calls).
   * Use this instead of analyzeAllRepos() when the user has selected repos.
   */
  async analyzeSelectedRepos(repos: Array<{ fullName: string }>): Promise<RepoAnalysis[]> {
    const analyses: RepoAnalysis[] = []

    // Limit to 5 repos to conserve API calls (~14 calls per repo)
    for (const repo of repos.slice(0, 5)) {
      const [owner, name] = repo.fullName.split('/')
      if (!owner || !name) continue

      try {
        const analysis = await this.analyzeRepo(owner, name)
        analyses.push(analysis)
      } catch (e) {
        const errStr = String(e)
        if (errStr.includes('rate limit')) {
          console.error('GitHub rate limit hit during repo analysis, stopping')
          break
        }
        console.error(`Failed to analyze ${repo.fullName}:`, e)
      }
    }

    return analyses
  }

  async analyzeAllRepos(): Promise<RepoAnalysis[]> {
    const client = await this.getClient()
    const analyses: RepoAnalysis[] = []

    // Get repos the user has access to
    const { data: repos } = await client.repos.listForAuthenticatedUser({
      sort: 'pushed',
      per_page: 10, // Reduced from 20 to conserve API calls
    })

    for (const repo of repos) {
      try {
        const analysis = await this.analyzeRepo(repo.owner.login, repo.name)
        analyses.push(analysis)
      } catch (e) {
        const errStr = String(e)
        if (errStr.includes('rate limit')) {
          console.error('GitHub rate limit hit during repo analysis, stopping')
          break
        }
        console.error(`Failed to analyze ${repo.full_name}:`, e)
      }
    }

    return analyses
  }

  async analyzeRepo(owner: string, repo: string): Promise<RepoAnalysis> {
    const client = await this.getClient()

    // Get repo info
    const { data: repoData } = await client.repos.get({ owner, repo })

    // Analyze in parallel
    const [structure, codeInsights, issues, prs] = await Promise.all([
      this.analyzeStructure(owner, repo),
      this.analyzeCodeForTodos(owner, repo),
      this.analyzeIssues(owner, repo),
      this.analyzePRs(owner, repo),
    ])

    // Calculate completeness
    const completeness = this.calculateCompleteness(structure, codeInsights, issues)

    return {
      repo: {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        url: repoData.html_url,
        defaultBranch: repoData.default_branch,
        language: repoData.language,
        stars: repoData.stargazers_count,
        openIssues: repoData.open_issues_count,
        lastPush: new Date(repoData.pushed_at || Date.now()),
      },
      structure,
      codeInsights,
      completeness,
      issues,
      prs,
    }
  }

  private async analyzeStructure(owner: string, repo: string): Promise<RepoAnalysis['structure']> {
    const client = await this.getClient()

    try {
      const { data: contents } = await client.repos.getContent({
        owner,
        repo,
        path: '',
      })

      const files = Array.isArray(contents) ? contents : [contents]
      const fileNames = files.map(f => f.name.toLowerCase())
      const folders = files.filter(f => f.type === 'dir').map(f => f.name)

      // Check for common files
      const hasReadme = fileNames.some(f => f.startsWith('readme'))
      const hasTests = folders.some(f => ['test', 'tests', '__tests__', 'spec'].includes(f.toLowerCase()))
      const hasCI = fileNames.includes('.github') || fileNames.some(f => f.includes('ci') || f.includes('travis') || f.includes('circle'))
      const hasDocs = folders.some(f => ['docs', 'documentation', 'doc'].includes(f.toLowerCase()))
      const hasDocker = fileNames.some(f => f.includes('docker'))
      const hasEnvExample = fileNames.some(f => f.includes('.env.example') || f.includes('.env.sample'))

      // Count total files (rough estimate)
      let fileCount = files.length
      for (const folder of folders.slice(0, 5)) {
        try {
          const { data: subContents } = await client.repos.getContent({ owner, repo, path: folder })
          if (Array.isArray(subContents)) {
            fileCount += subContents.length
          }
        } catch {
          // Ignore errors for subfolders
        }
      }

      return {
        hasReadme,
        hasTests,
        hasCI,
        hasDocs,
        hasDocker,
        hasEnvExample,
        mainFolders: folders.slice(0, 10),
        fileCount,
      }
    } catch {
      return {
        hasReadme: false,
        hasTests: false,
        hasCI: false,
        hasDocs: false,
        hasDocker: false,
        hasEnvExample: false,
        mainFolders: [],
        fileCount: 0,
      }
    }
  }

  private async analyzeCodeForTodos(owner: string, repo: string): Promise<RepoAnalysis['codeInsights']> {
    const client = await this.getClient()
    const todos: TodoItem[] = []
    const fixmes: TodoItem[] = []
    const hacks: TodoItem[] = []

    try {
      // Search for TODOs
      const todoSearch = await client.search.code({
        q: `TODO repo:${owner}/${repo}`,
        per_page: 50,
      })

      for (const item of todoSearch.data.items.slice(0, 30)) {
        todos.push({
          file: item.path,
          line: 1, // Search API doesn't give line numbers
          text: `TODO in ${item.name}`,
          priority: this.inferPriority(item.path),
          url: item.html_url,
        })
      }

      // Search for FIXMEs
      const fixmeSearch = await client.search.code({
        q: `FIXME repo:${owner}/${repo}`,
        per_page: 30,
      })

      for (const item of fixmeSearch.data.items.slice(0, 20)) {
        fixmes.push({
          file: item.path,
          line: 1,
          text: `FIXME in ${item.name}`,
          priority: 'high',
          url: item.html_url,
        })
      }

      // Search for HACKs
      const hackSearch = await client.search.code({
        q: `HACK repo:${owner}/${repo}`,
        per_page: 20,
      })

      for (const item of hackSearch.data.items.slice(0, 10)) {
        hacks.push({
          file: item.path,
          line: 1,
          text: `HACK in ${item.name}`,
          priority: 'medium',
          url: item.html_url,
        })
      }
    } catch (e) {
      // Search might fail for private repos or rate limits
      console.error('Code search failed:', e)
    }

    return {
      todos,
      fixmes,
      hacks,
      totalTodos: todos.length + fixmes.length + hacks.length,
    }
  }

  private async analyzeIssues(owner: string, repo: string): Promise<RepoAnalysis['issues']> {
    const client = await this.getClient()

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const { data: openIssues } = await client.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100,
      })

      const { data: closedIssues } = await client.issues.listForRepo({
        owner,
        repo,
        state: 'closed',
        per_page: 50,
        since: thirtyDaysAgo.toISOString(),
      })

      // Filter out PRs (GitHub API returns PRs in issues endpoint)
      const realOpenIssues = openIssues.filter(i => !i.pull_request)
      const realClosedIssues = closedIssues.filter(i => !i.pull_request)

      const staleIssues = realOpenIssues.filter(i => new Date(i.created_at) < thirtyDaysAgo)
      const bugIssues = realOpenIssues.filter(i =>
        i.labels.some(l => {
          const name = typeof l === 'string' ? l : l.name
          return name?.toLowerCase().includes('bug')
        })
      )
      const featureIssues = realOpenIssues.filter(i =>
        i.labels.some(l => {
          const name = typeof l === 'string' ? l : l.name
          return name?.toLowerCase().includes('feature') || name?.toLowerCase().includes('enhancement')
        })
      )

      return {
        open: realOpenIssues.length,
        closed: realClosedIssues.length,
        stale: staleIssues.length,
        bugCount: bugIssues.length,
        featureCount: featureIssues.length,
      }
    } catch {
      return { open: 0, closed: 0, stale: 0, bugCount: 0, featureCount: 0 }
    }
  }

  private async analyzePRs(owner: string, repo: string): Promise<RepoAnalysis['prs']> {
    const client = await this.getClient()

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const { data: openPRs } = await client.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 50,
      })

      const { data: mergedPRs } = await client.pulls.list({
        owner,
        repo,
        state: 'closed',
        per_page: 30,
      })

      const stalePRs = openPRs.filter(pr => new Date(pr.created_at) < sevenDaysAgo)

      // Calculate average merge time
      const recentMerged = mergedPRs.filter(pr => pr.merged_at).slice(0, 20)
      let avgMergeTime: number | null = null
      if (recentMerged.length > 0) {
        const mergeTimes = recentMerged.map(pr => {
          const created = new Date(pr.created_at).getTime()
          const merged = new Date(pr.merged_at!).getTime()
          return (merged - created) / (1000 * 60 * 60) // hours
        })
        avgMergeTime = Math.round(mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length)
      }

      return {
        open: openPRs.length,
        stale: stalePRs.length,
        avgMergeTime,
      }
    } catch {
      return { open: 0, stale: 0, avgMergeTime: null }
    }
  }

  private inferPriority(filePath: string): 'low' | 'medium' | 'high' {
    const path = filePath.toLowerCase()
    if (path.includes('test') || path.includes('spec')) return 'low'
    if (path.includes('core') || path.includes('main') || path.includes('index')) return 'high'
    if (path.includes('util') || path.includes('helper')) return 'low'
    return 'medium'
  }

  private calculateCompleteness(
    structure: RepoAnalysis['structure'],
    codeInsights: RepoAnalysis['codeInsights'],
    issues: RepoAnalysis['issues']
  ): RepoAnalysis['completeness'] {
    let score = 50 // Base score
    const missingElements: string[] = []
    const strengths: string[] = []

    // Structure checks (+/- 5-10 points each)
    if (structure.hasReadme) {
      score += 10
      strengths.push('Has README documentation')
    } else {
      score -= 5
      missingElements.push('Missing README')
    }

    if (structure.hasTests) {
      score += 15
      strengths.push('Has test suite')
    } else {
      score -= 10
      missingElements.push('Missing tests')
    }

    if (structure.hasCI) {
      score += 10
      strengths.push('Has CI/CD configuration')
    } else {
      missingElements.push('Missing CI/CD setup')
    }

    if (structure.hasDocs) {
      score += 5
      strengths.push('Has documentation folder')
    }

    if (structure.hasDocker) {
      score += 5
      strengths.push('Has Docker configuration')
    }

    if (structure.hasEnvExample) {
      score += 5
      strengths.push('Has environment example file')
    } else {
      missingElements.push('Missing .env.example')
    }

    // Code quality checks
    if (codeInsights.totalTodos > 20) {
      score -= 15
      missingElements.push(`High TODO count (${codeInsights.totalTodos})`)
    } else if (codeInsights.totalTodos > 10) {
      score -= 8
      missingElements.push(`Moderate TODO count (${codeInsights.totalTodos})`)
    } else if (codeInsights.totalTodos > 0) {
      score -= 3
    }

    if (codeInsights.fixmes.length > 5) {
      score -= 10
      missingElements.push(`Multiple FIXMEs need attention (${codeInsights.fixmes.length})`)
    }

    // Issue health
    if (issues.stale > 10) {
      score -= 10
      missingElements.push(`Many stale issues (${issues.stale})`)
    }

    if (issues.bugCount > 5) {
      score -= 5
      missingElements.push(`Open bugs need fixing (${issues.bugCount})`)
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score))

    return { score, missingElements, strengths }
  }
}

export type { RepoAnalysis as GitHubRepoAnalysis }
