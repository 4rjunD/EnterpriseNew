import { prisma } from '@nexflow/database'
import Anthropic from '@anthropic-ai/sdk'

interface RepoAnalysis {
  fullName: string
  structure: {
    hasTests: boolean
    hasCI: boolean
    hasDocs: boolean
    hasDocker: boolean
    hasEslint: boolean
    hasPrettier: boolean
    hasTypeScript: boolean
    packageManager: string | null
    frameworks: string[]
  }
  codeInsights: {
    todos: Array<{ text: string; file: string; line: number }>
    fixmes: Array<{ text: string; file: string; line: number }>
  }
  metrics: {
    completeness: number
    openPRs: number
    openIssues: number
    todoCount: number
    fixmeCount: number
  }
}

interface KnowledgeBaseInsights {
  techStackSummary: string
  architectureSummary: string
  recommendations: Array<{
    title: string
    description: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    category: string
  }>
  goalProgress: {
    alignmentScore: number
    missingCapabilities: string[]
    suggestions: string[]
  } | null
}

/**
 * KnowledgeBaseBuilder analyzes all repositories and project context
 * to build an AI-powered knowledge base for the organization.
 */
export class KnowledgeBaseBuilder {
  private organizationId: string
  private anthropic: Anthropic | null = null

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not set')
      }
      this.anthropic = new Anthropic({ apiKey })
    }
    return this.anthropic
  }

  /**
   * Build or update the organization's knowledge base.
   */
  async build(): Promise<void> {
    // 1. Get selected repos with cached analyses
    const repos = await prisma.selectedRepository.findMany({
      where: { organizationId: this.organizationId },
    })

    // 2. Get cached analyses
    const analyses = await this.getCachedAnalyses(repos.map(r => r.fullName))

    // 3. Get project context for goal comparison
    const projectContext = await prisma.projectContext.findFirst({
      where: { organizationId: this.organizationId },
    })

    // 4. Calculate aggregate metrics
    const totalRepos = repos.length
    const totalTodos = repos.reduce((sum, r) => sum + r.todoCount, 0)
    const totalOpenPRs = repos.reduce((sum, r) => sum + r.openPRCount, 0)

    const reposWithScore = repos.filter(r => r.completenessScore !== null)
    const avgCompleteness = reposWithScore.length > 0
      ? reposWithScore.reduce((sum, r) => sum + (r.completenessScore || 0), 0) / reposWithScore.length
      : 0

    // 5. Generate AI insights if we have analyses
    let insights: KnowledgeBaseInsights | null = null
    if (analyses.length > 0) {
      insights = await this.generateAIInsights(analyses, projectContext)
    }

    // 6. Store knowledge base
    const existing = await prisma.organizationKnowledgeBase.findUnique({
      where: { organizationId: this.organizationId },
    })

    if (existing) {
      await prisma.organizationKnowledgeBase.update({
        where: { organizationId: this.organizationId },
        data: {
          totalRepos,
          avgCompleteness: Math.round(avgCompleteness),
          totalTodos,
          totalOpenPRs,
          lastAnalyzedAt: new Date(),
          ...(insights && {
            techStackSummary: insights.techStackSummary,
            architectureSummary: insights.architectureSummary,
            recommendations: insights.recommendations as object,
            goalProgress: insights.goalProgress as object | undefined,
          }),
        },
      })
    } else {
      await prisma.organizationKnowledgeBase.create({
        data: {
          organizationId: this.organizationId,
          totalRepos,
          avgCompleteness: Math.round(avgCompleteness),
          totalTodos,
          totalOpenPRs,
          lastAnalyzedAt: new Date(),
          ...(insights && {
            techStackSummary: insights.techStackSummary,
            architectureSummary: insights.architectureSummary,
            recommendations: insights.recommendations as object,
            goalProgress: insights.goalProgress as object | undefined,
          }),
        },
      })
    }
  }

  /**
   * Get cached repo analyses.
   */
  private async getCachedAnalyses(repoFullNames: string[]): Promise<RepoAnalysis[]> {
    if (repoFullNames.length === 0) return []

    const caches = await prisma.repoAnalysisCache.findMany({
      where: {
        organizationId: this.organizationId,
        repoFullName: { in: repoFullNames },
        expiresAt: { gt: new Date() }, // Only non-expired
      },
    })

    return caches.map(cache => ({
      fullName: cache.repoFullName,
      structure: cache.structure as RepoAnalysis['structure'],
      codeInsights: cache.codeInsights as RepoAnalysis['codeInsights'],
      metrics: cache.metrics as RepoAnalysis['metrics'],
    }))
  }

  /**
   * Generate AI insights from repo analyses and project context.
   */
  private async generateAIInsights(
    analyses: RepoAnalysis[],
    projectContext: { buildingDescription: string; goals: string[]; techStack: string[] } | null
  ): Promise<KnowledgeBaseInsights> {
    try {
      const client = this.getAnthropicClient()

      // Summarize repo data for prompt
      const repoSummaries = analyses.map(a => ({
        repo: a.fullName,
        hasTests: a.structure.hasTests,
        hasCI: a.structure.hasCI,
        hasDocs: a.structure.hasDocs,
        hasTypeScript: a.structure.hasTypeScript,
        frameworks: a.structure.frameworks,
        completeness: a.metrics.completeness,
        openPRs: a.metrics.openPRs,
        todoCount: a.metrics.todoCount,
      }))

      // Aggregate tech stack
      const allFrameworks = new Set<string>()
      const allTech: string[] = []

      analyses.forEach(a => {
        a.structure.frameworks.forEach(f => allFrameworks.add(f))
        if (a.structure.hasTypeScript) allTech.push('TypeScript')
        if (a.structure.packageManager) allTech.push(a.structure.packageManager)
        if (a.structure.hasDocker) allTech.push('Docker')
      })

      const prompt = `Analyze these repositories and generate insights:

REPOSITORIES:
${JSON.stringify(repoSummaries, null, 2)}

${projectContext ? `
PROJECT CONTEXT:
- Building: ${projectContext.buildingDescription}
- Goals: ${projectContext.goals.join(', ')}
- Tech Stack: ${projectContext.techStack.join(', ')}
` : ''}

Provide a JSON response with:
{
  "techStackSummary": "Brief summary of the tech stack (2-3 sentences)",
  "architectureSummary": "Brief summary of architecture patterns observed (2-3 sentences)",
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "priority": "HIGH|MEDIUM|LOW",
      "category": "testing|ci|docs|security|performance|architecture"
    }
  ],
  "goalProgress": ${projectContext ? `{
    "alignmentScore": 0-100,
    "missingCapabilities": ["list of missing capabilities"],
    "suggestions": ["suggestions to reach goals"]
  }` : 'null'}
}

Focus on actionable, specific recommendations. Limit to 3-5 recommendations.`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type')
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0]) as KnowledgeBaseInsights
      return parsed

    } catch (error) {
      console.error('AI insights generation failed:', error)

      // Return fallback insights
      return {
        techStackSummary: `Organization uses ${Array.from(new Set(analyses.flatMap(a => a.structure.frameworks))).slice(0, 3).join(', ') || 'various'} frameworks across ${analyses.length} repositories.`,
        architectureSummary: `The codebase consists of ${analyses.length} repositories with varying levels of completeness.`,
        recommendations: [
          {
            title: 'Add comprehensive testing',
            description: 'Repositories without tests have higher bug risk.',
            priority: 'HIGH',
            category: 'testing',
          },
          {
            title: 'Set up CI/CD pipelines',
            description: 'Automated builds and deploys reduce manual errors.',
            priority: 'MEDIUM',
            category: 'ci',
          },
        ],
        goalProgress: null,
      }
    }
  }

  /**
   * Get the current knowledge base.
   */
  async get(): Promise<{
    techStackSummary: string | null
    architectureSummary: string | null
    recommendations: unknown
    goalProgress: unknown
    totalRepos: number
    avgCompleteness: number
    totalTodos: number
    totalOpenPRs: number
    lastAnalyzedAt: Date | null
  } | null> {
    const kb = await prisma.organizationKnowledgeBase.findUnique({
      where: { organizationId: this.organizationId },
    })

    return kb
  }

  /**
   * Trigger a rebuild if needed (e.g., after new repo analysis).
   */
  async rebuildIfStale(maxAgeHours: number = 6): Promise<boolean> {
    const kb = await prisma.organizationKnowledgeBase.findUnique({
      where: { organizationId: this.organizationId },
    })

    if (!kb || !kb.lastAnalyzedAt) {
      await this.build()
      return true
    }

    const hoursSince = (Date.now() - kb.lastAnalyzedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSince > maxAgeHours) {
      await this.build()
      return true
    }

    return false
  }
}
