import Anthropic from '@anthropic-ai/sdk'
import {
  prisma,
  TaskStatus,
  TaskPriority,
  TaskSource,
  BottleneckType,
  BottleneckSeverity,
  PredictionType,
} from '@nexflow/database'
import type { GitHubRepoAnalysis } from '@nexflow/integrations'

export interface AnalysisResult {
  tasksCreated: number
  bottlenecksCreated: number
  predictionsCreated: number
  projectsCreated: number
  insights: string[]
}

interface ProjectContext {
  buildingDescription: string
  milestones: Array<{ name: string; targetDate?: string; status?: string }> | null
  goals: string[]
  techStack: string[]
}

interface GeneratedTask {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  category: 'bug' | 'feature' | 'tech_debt' | 'documentation' | 'testing' | 'infrastructure'
  source: string // repo name
}

interface GeneratedBottleneck {
  type: 'STUCK_PR' | 'STALE_TASK' | 'DEPENDENCY_BLOCK' | 'REVIEW_DELAY' | 'CI_FAILURE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  impact: string
}

interface GeneratedPrediction {
  type: 'DEADLINE_RISK' | 'BURNOUT_INDICATOR' | 'VELOCITY_FORECAST' | 'SCOPE_CREEP'
  confidence: number
  reasoning: string
  value: Record<string, unknown>
}

interface AIAnalysisResponse {
  tasks: GeneratedTask[]
  bottlenecks: GeneratedBottleneck[]
  predictions: GeneratedPrediction[]
  suggestedProjects: Array<{
    name: string
    key: string
    description: string
    basedOnRepo: string
  }>
  overallInsights: string[]
}

export class AutonomousAnalyzer {
  private organizationId: string
  private anthropic: Anthropic | null = null

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private getAI(): Anthropic {
    if (!this.anthropic) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    }
    return this.anthropic
  }

  async analyzeAndGenerate(repoAnalyses: GitHubRepoAnalysis[]): Promise<AnalysisResult> {
    // Get project context
    const projectContext = await this.getProjectContext()

    // Get existing projects to avoid duplicates
    const existingProjects = await prisma.project.findMany({
      where: { organizationId: this.organizationId },
      select: { name: true, key: true },
    })

    // Get existing tasks to avoid duplicates
    const existingTasks = await prisma.task.findMany({
      where: { organizationId: this.organizationId },
      select: { title: true, externalId: true },
    })

    // Generate insights using AI
    const aiAnalysis = await this.generateAIInsights(
      repoAnalyses,
      projectContext,
      existingProjects,
      existingTasks.map(t => t.title)
    )

    // Create projects first (so we can link tasks to them)
    const projectsCreated = await this.createProjects(aiAnalysis.suggestedProjects, existingProjects)

    // Create tasks
    const tasksCreated = await this.createTasks(aiAnalysis.tasks)

    // Create bottlenecks
    const bottlenecksCreated = await this.createBottlenecks(aiAnalysis.bottlenecks)

    // Create predictions
    const predictionsCreated = await this.createPredictions(aiAnalysis.predictions)

    return {
      tasksCreated,
      bottlenecksCreated,
      predictionsCreated,
      projectsCreated,
      insights: aiAnalysis.overallInsights,
    }
  }

  private async getProjectContext(): Promise<ProjectContext | null> {
    const context = await prisma.projectContext.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!context) return null

    return {
      buildingDescription: context.buildingDescription,
      milestones: context.milestones as ProjectContext['milestones'],
      goals: context.goals,
      techStack: context.techStack,
    }
  }

  private async generateAIInsights(
    repoAnalyses: GitHubRepoAnalysis[],
    projectContext: ProjectContext | null,
    existingProjects: Array<{ name: string; key: string }>,
    existingTaskTitles: string[]
  ): Promise<AIAnalysisResponse> {
    const ai = this.getAI()

    const prompt = this.buildAnalysisPrompt(
      repoAnalyses,
      projectContext,
      existingProjects,
      existingTaskTitles
    )

    try {
      const response = await ai.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type')
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/)
      if (!jsonMatch) {
        // Try to parse the entire response as JSON
        return JSON.parse(content.text)
      }

      return JSON.parse(jsonMatch[1])
    } catch (e) {
      console.error('AI analysis failed:', e)
      // Return fallback analysis based on raw data
      return this.generateFallbackAnalysis(repoAnalyses)
    }
  }

  private buildAnalysisPrompt(
    repoAnalyses: GitHubRepoAnalysis[],
    projectContext: ProjectContext | null,
    existingProjects: Array<{ name: string; key: string }>,
    existingTaskTitles: string[]
  ): string {
    const repoSummaries = repoAnalyses.map(r => ({
      name: r.repo.fullName,
      description: r.repo.description,
      language: r.repo.language,
      completenessScore: r.completeness.score,
      missingElements: r.completeness.missingElements,
      strengths: r.completeness.strengths,
      todoCount: r.codeInsights.totalTodos,
      openIssues: r.issues.open,
      staleIssues: r.issues.stale,
      bugCount: r.issues.bugCount,
      openPRs: r.prs.open,
      stalePRs: r.prs.stale,
      avgMergeTime: r.prs.avgMergeTime,
      hasTests: r.structure.hasTests,
      hasCI: r.structure.hasCI,
      hasDocs: r.structure.hasDocs,
    }))

    return `You are an AI engineering manager analyzing GitHub repositories to generate actionable insights.

## Project Context
${projectContext ? `
The team is building: ${projectContext.buildingDescription}

Goals: ${projectContext.goals.join(', ')}
Tech Stack: ${projectContext.techStack.join(', ')}
${projectContext.milestones ? `Milestones: ${JSON.stringify(projectContext.milestones)}` : ''}
` : 'No project context provided - analyze based on repository data only.'}

## Repository Analysis
${JSON.stringify(repoSummaries, null, 2)}

## Existing Projects (avoid duplicates)
${existingProjects.map(p => `- ${p.name} (${p.key})`).join('\n') || 'None'}

## Existing Tasks (avoid duplicates)
${existingTaskTitles.slice(0, 50).join('\n') || 'None'}

## Your Task
Based on the repository analysis and project context, generate:

1. **Tasks** (5-15): Actionable work items based on:
   - TODOs/FIXMEs found in code
   - Missing tests, documentation, CI
   - Open bugs and stale issues
   - Code quality improvements
   DO NOT duplicate existing tasks.

2. **Bottlenecks** (2-5): Current blockers affecting delivery:
   - Stale PRs that need review
   - Dependencies or technical debt
   - CI/CD issues
   - Review delays

3. **Predictions** (2-4): Forward-looking insights:
   - Deadline risks based on current velocity
   - Scope creep indicators
   - Team capacity concerns

4. **Suggested Projects** (0-3): If repos don't map to existing projects, suggest new ones.

5. **Overall Insights** (3-5): Key observations for the engineering manager.

Respond with ONLY a JSON object in this exact format:
\`\`\`json
{
  "tasks": [
    {
      "title": "Short actionable title",
      "description": "Detailed description of what needs to be done",
      "priority": "LOW|MEDIUM|HIGH|URGENT",
      "category": "bug|feature|tech_debt|documentation|testing|infrastructure",
      "source": "repo-name"
    }
  ],
  "bottlenecks": [
    {
      "type": "STUCK_PR|STALE_TASK|DEPENDENCY_BLOCK|REVIEW_DELAY|CI_FAILURE",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "title": "Clear bottleneck title",
      "description": "What is blocked and why",
      "impact": "Business/delivery impact"
    }
  ],
  "predictions": [
    {
      "type": "DEADLINE_RISK|BURNOUT_INDICATOR|VELOCITY_FORECAST|SCOPE_CREEP",
      "confidence": 0.75,
      "reasoning": "Why this prediction",
      "value": {"riskLevel": "high", "daysAtRisk": 5}
    }
  ],
  "suggestedProjects": [
    {
      "name": "Project Name",
      "key": "PROJ",
      "description": "Project description",
      "basedOnRepo": "owner/repo"
    }
  ],
  "overallInsights": [
    "Key insight 1",
    "Key insight 2"
  ]
}
\`\`\`

Be specific, actionable, and prioritize high-impact items. Focus on things that will help the team ship faster and with higher quality.`
  }

  private generateFallbackAnalysis(repoAnalyses: GitHubRepoAnalysis[]): AIAnalysisResponse {
    const tasks: GeneratedTask[] = []
    const bottlenecks: GeneratedBottleneck[] = []
    const predictions: GeneratedPrediction[] = []
    const insights: string[] = []

    for (const analysis of repoAnalyses) {
      // Generate tasks from missing elements
      for (const missing of analysis.completeness.missingElements) {
        if (missing.includes('test')) {
          tasks.push({
            title: `Add test suite to ${analysis.repo.name}`,
            description: `The repository ${analysis.repo.fullName} is missing a test suite. Add unit and integration tests.`,
            priority: 'HIGH',
            category: 'testing',
            source: analysis.repo.fullName,
          })
        }
        if (missing.includes('CI')) {
          tasks.push({
            title: `Set up CI/CD for ${analysis.repo.name}`,
            description: `Configure continuous integration and deployment for ${analysis.repo.fullName}.`,
            priority: 'MEDIUM',
            category: 'infrastructure',
            source: analysis.repo.fullName,
          })
        }
        if (missing.includes('README')) {
          tasks.push({
            title: `Add README to ${analysis.repo.name}`,
            description: `Create comprehensive README documentation for ${analysis.repo.fullName}.`,
            priority: 'MEDIUM',
            category: 'documentation',
            source: analysis.repo.fullName,
          })
        }
      }

      // Generate bottlenecks from stale PRs
      if (analysis.prs.stale > 0) {
        bottlenecks.push({
          type: 'REVIEW_DELAY',
          severity: analysis.prs.stale > 3 ? 'HIGH' : 'MEDIUM',
          title: `${analysis.prs.stale} stale PRs in ${analysis.repo.name}`,
          description: `There are ${analysis.prs.stale} pull requests older than 7 days awaiting review.`,
          impact: 'Blocking feature releases and causing code divergence.',
        })
      }

      // Generate predictions from completeness score
      if (analysis.completeness.score < 50) {
        predictions.push({
          type: 'DEADLINE_RISK',
          confidence: 0.7,
          reasoning: `${analysis.repo.name} has a low completeness score (${analysis.completeness.score}/100), indicating technical debt.`,
          value: { riskLevel: 'high', repository: analysis.repo.fullName },
        })
      }

      // Add insights
      if (analysis.codeInsights.totalTodos > 10) {
        insights.push(`${analysis.repo.name} has ${analysis.codeInsights.totalTodos} TODOs/FIXMEs that need attention.`)
      }
    }

    // Aggregate insights
    const totalOpenPRs = repoAnalyses.reduce((sum, r) => sum + r.prs.open, 0)
    const totalOpenIssues = repoAnalyses.reduce((sum, r) => sum + r.issues.open, 0)
    const avgCompleteness = Math.round(
      repoAnalyses.reduce((sum, r) => sum + r.completeness.score, 0) / repoAnalyses.length
    )

    insights.push(`Average repository completeness: ${avgCompleteness}%`)
    insights.push(`Total open PRs across all repos: ${totalOpenPRs}`)
    insights.push(`Total open issues: ${totalOpenIssues}`)

    return {
      tasks: tasks.slice(0, 15),
      bottlenecks: bottlenecks.slice(0, 5),
      predictions: predictions.slice(0, 4),
      suggestedProjects: [],
      overallInsights: insights,
    }
  }

  private async createProjects(
    suggestedProjects: AIAnalysisResponse['suggestedProjects'],
    existingProjects: Array<{ name: string; key: string }>
  ): Promise<number> {
    let created = 0
    const existingKeys = new Set(existingProjects.map(p => p.key.toUpperCase()))

    for (const project of suggestedProjects) {
      const key = project.key.toUpperCase()
      if (existingKeys.has(key)) continue

      try {
        await prisma.project.create({
          data: {
            name: project.name,
            key,
            description: project.description,
            status: 'ACTIVE',
            organizationId: this.organizationId,
          },
        })
        created++
        existingKeys.add(key)
      } catch (e) {
        console.error(`Failed to create project ${project.name}:`, e)
      }
    }

    return created
  }

  private async createTasks(tasks: GeneratedTask[]): Promise<number> {
    let created = 0

    for (const task of tasks) {
      try {
        // Check if task already exists (rough duplicate check)
        const existing = await prisma.task.findFirst({
          where: {
            organizationId: this.organizationId,
            title: { contains: task.title.substring(0, 30), mode: 'insensitive' },
          },
        })

        if (existing) continue

        await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            status: TaskStatus.BACKLOG,
            priority: task.priority as TaskPriority,
            source: TaskSource.INTERNAL,
            labels: [task.category, 'auto-generated'],
            organizationId: this.organizationId,
          },
        })
        created++
      } catch (e) {
        console.error(`Failed to create task "${task.title}":`, e)
      }
    }

    return created
  }

  private async createBottlenecks(bottlenecks: GeneratedBottleneck[]): Promise<number> {
    let created = 0

    // Find an active project to link bottlenecks to
    const project = await prisma.project.findFirst({
      where: { organizationId: this.organizationId, status: 'ACTIVE' },
    })

    for (const bottleneck of bottlenecks) {
      try {
        // Check if similar bottleneck exists
        const existing = await prisma.bottleneck.findFirst({
          where: {
            project: { organizationId: this.organizationId },
            title: { contains: bottleneck.title.substring(0, 30), mode: 'insensitive' },
            status: 'ACTIVE',
          },
        })

        if (existing) continue

        await prisma.bottleneck.create({
          data: {
            type: bottleneck.type as BottleneckType,
            severity: bottleneck.severity as BottleneckSeverity,
            title: bottleneck.title,
            description: bottleneck.description,
            impact: bottleneck.impact,
            status: 'ACTIVE',
            projectId: project?.id,
          },
        })
        created++
      } catch (e) {
        console.error(`Failed to create bottleneck "${bottleneck.title}":`, e)
      }
    }

    return created
  }

  private async createPredictions(predictions: GeneratedPrediction[]): Promise<number> {
    let created = 0

    // Find an active project to link predictions to
    const project = await prisma.project.findFirst({
      where: { organizationId: this.organizationId, status: 'ACTIVE' },
    })

    for (const prediction of predictions) {
      try {
        await prisma.prediction.create({
          data: {
            type: prediction.type as PredictionType,
            confidence: prediction.confidence,
            reasoning: prediction.reasoning,
            value: prediction.value as object,
            isActive: true,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            projectId: project?.id,
          },
        })
        created++
      } catch (e) {
        console.error(`Failed to create prediction:`, e)
      }
    }

    return created
  }
}
