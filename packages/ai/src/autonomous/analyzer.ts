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
  category: string
  source: string
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

export class AutonomousAnalyzer {
  private organizationId: string
  private anthropic: Anthropic | null = null

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private getAI(): Anthropic | null {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No ANTHROPIC_API_KEY found, using fallback analysis')
      return null
    }
    if (!this.anthropic) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    }
    return this.anthropic
  }

  async analyzeAndGenerate(repoAnalyses: GitHubRepoAnalysis[]): Promise<AnalysisResult> {
    console.log(`Starting autonomous analysis for org ${this.organizationId} with ${repoAnalyses.length} repos`)

    // Get project context
    const projectContext = await this.getProjectContext()
    console.log('Project context:', projectContext ? 'found' : 'not found')

    // ALWAYS generate comprehensive analysis from repo data first
    const baseAnalysis = this.generateComprehensiveAnalysis(repoAnalyses, projectContext)
    console.log(`Base analysis: ${baseAnalysis.tasks.length} tasks, ${baseAnalysis.bottlenecks.length} bottlenecks, ${baseAnalysis.predictions.length} predictions`)

    // Try to enhance with AI if available
    let aiAnalysis = baseAnalysis
    const ai = this.getAI()
    if (ai && repoAnalyses.length > 0) {
      try {
        const enhanced = await this.generateAIInsights(ai, repoAnalyses, projectContext)
        if (enhanced.tasks.length > 0 || enhanced.bottlenecks.length > 0) {
          // Merge AI results with base analysis
          aiAnalysis = {
            tasks: [...baseAnalysis.tasks, ...enhanced.tasks],
            bottlenecks: [...baseAnalysis.bottlenecks, ...enhanced.bottlenecks],
            predictions: [...baseAnalysis.predictions, ...enhanced.predictions],
            suggestedProjects: [...baseAnalysis.suggestedProjects, ...enhanced.suggestedProjects],
            overallInsights: [...baseAnalysis.overallInsights, ...enhanced.overallInsights],
          }
          console.log(`AI enhanced: ${aiAnalysis.tasks.length} total tasks`)
        }
      } catch (e) {
        console.error('AI analysis failed, using base analysis:', e)
      }
    }

    // Create everything - be aggressive!
    const projectsCreated = await this.createProjects(aiAnalysis.suggestedProjects)
    const tasksCreated = await this.createTasks(aiAnalysis.tasks)
    const bottlenecksCreated = await this.createBottlenecks(aiAnalysis.bottlenecks)
    const predictionsCreated = await this.createPredictions(aiAnalysis.predictions)

    console.log(`Created: ${tasksCreated} tasks, ${bottlenecksCreated} bottlenecks, ${predictionsCreated} predictions, ${projectsCreated} projects`)

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

  // Generate comprehensive analysis from repo data - ALWAYS produces results
  private generateComprehensiveAnalysis(
    repoAnalyses: GitHubRepoAnalysis[],
    projectContext: ProjectContext | null
  ): {
    tasks: GeneratedTask[]
    bottlenecks: GeneratedBottleneck[]
    predictions: GeneratedPrediction[]
    suggestedProjects: Array<{ name: string; key: string; description: string; basedOnRepo: string }>
    overallInsights: string[]
  } {
    const tasks: GeneratedTask[] = []
    const bottlenecks: GeneratedBottleneck[] = []
    const predictions: GeneratedPrediction[] = []
    const suggestedProjects: Array<{ name: string; key: string; description: string; basedOnRepo: string }> = []
    const insights: string[] = []

    // Aggregate stats
    let totalTodos = 0
    let totalOpenPRs = 0
    let totalStalePRs = 0
    let totalOpenIssues = 0
    let totalStaleIssues = 0
    let totalBugs = 0
    let avgCompleteness = 0

    for (const analysis of repoAnalyses) {
      const repoName = analysis.repo.name
      const fullName = analysis.repo.fullName

      totalTodos += analysis.codeInsights.totalTodos
      totalOpenPRs += analysis.prs.open
      totalStalePRs += analysis.prs.stale
      totalOpenIssues += analysis.issues.open
      totalStaleIssues += analysis.issues.stale
      totalBugs += analysis.issues.bugCount
      avgCompleteness += analysis.completeness.score

      // === TASKS FROM MISSING STRUCTURE ===
      if (!analysis.structure.hasTests) {
        tasks.push({
          title: `Add comprehensive test suite for ${repoName}`,
          description: `The repository ${fullName} is missing tests. Implement unit tests and integration tests to ensure code quality and prevent regressions. Consider using Jest, Vitest, or your preferred testing framework.`,
          priority: 'HIGH',
          category: 'testing',
          source: fullName,
        })
      }

      if (!analysis.structure.hasCI) {
        tasks.push({
          title: `Set up CI/CD pipeline for ${repoName}`,
          description: `Configure continuous integration and deployment for ${fullName}. Set up GitHub Actions or similar to run tests, lint code, and automate deployments on push.`,
          priority: 'HIGH',
          category: 'infrastructure',
          source: fullName,
        })
      }

      if (!analysis.structure.hasReadme) {
        tasks.push({
          title: `Create README documentation for ${repoName}`,
          description: `Add comprehensive README.md to ${fullName} including: project overview, installation instructions, usage examples, API documentation, and contribution guidelines.`,
          priority: 'MEDIUM',
          category: 'documentation',
          source: fullName,
        })
      }

      if (!analysis.structure.hasDocs) {
        tasks.push({
          title: `Add documentation folder for ${repoName}`,
          description: `Create a /docs folder in ${fullName} with architecture diagrams, API docs, and developer guides to improve onboarding and maintainability.`,
          priority: 'LOW',
          category: 'documentation',
          source: fullName,
        })
      }

      if (!analysis.structure.hasEnvExample) {
        tasks.push({
          title: `Add .env.example for ${repoName}`,
          description: `Create .env.example file in ${fullName} documenting all required environment variables. This helps new developers set up the project correctly.`,
          priority: 'MEDIUM',
          category: 'documentation',
          source: fullName,
        })
      }

      if (!analysis.structure.hasDocker) {
        tasks.push({
          title: `Add Docker configuration for ${repoName}`,
          description: `Create Dockerfile and docker-compose.yml for ${fullName} to enable consistent development environments and easy deployment.`,
          priority: 'LOW',
          category: 'infrastructure',
          source: fullName,
        })
      }

      // === TASKS FROM CODE INSIGHTS ===
      if (analysis.codeInsights.todos.length > 0) {
        tasks.push({
          title: `Address ${analysis.codeInsights.todos.length} TODOs in ${repoName}`,
          description: `Found ${analysis.codeInsights.todos.length} TODO comments in ${fullName}. Review and either complete them or convert to tracked issues. Top files: ${analysis.codeInsights.todos.slice(0, 3).map(t => t.file).join(', ')}`,
          priority: analysis.codeInsights.todos.length > 10 ? 'HIGH' : 'MEDIUM',
          category: 'tech_debt',
          source: fullName,
        })
      }

      if (analysis.codeInsights.fixmes.length > 0) {
        tasks.push({
          title: `Fix ${analysis.codeInsights.fixmes.length} FIXMEs in ${repoName}`,
          description: `Found ${analysis.codeInsights.fixmes.length} FIXME comments in ${fullName} requiring immediate attention. These indicate known bugs or critical issues that need resolution.`,
          priority: 'URGENT',
          category: 'bug',
          source: fullName,
        })
      }

      if (analysis.codeInsights.hacks.length > 0) {
        tasks.push({
          title: `Refactor ${analysis.codeInsights.hacks.length} HACKs in ${repoName}`,
          description: `Found ${analysis.codeInsights.hacks.length} HACK comments in ${fullName}. These are temporary workarounds that should be properly refactored.`,
          priority: 'MEDIUM',
          category: 'tech_debt',
          source: fullName,
        })
      }

      // === TASKS FROM ISSUES ===
      if (analysis.issues.bugCount > 0) {
        tasks.push({
          title: `Triage ${analysis.issues.bugCount} bug reports in ${repoName}`,
          description: `There are ${analysis.issues.bugCount} open issues labeled as bugs in ${fullName}. Prioritize and assign these bugs to team members for resolution.`,
          priority: analysis.issues.bugCount > 5 ? 'HIGH' : 'MEDIUM',
          category: 'bug',
          source: fullName,
        })
      }

      if (analysis.issues.featureCount > 0) {
        tasks.push({
          title: `Review ${analysis.issues.featureCount} feature requests in ${repoName}`,
          description: `There are ${analysis.issues.featureCount} feature requests pending in ${fullName}. Review, prioritize, and add accepted features to the roadmap.`,
          priority: 'LOW',
          category: 'feature',
          source: fullName,
        })
      }

      if (analysis.issues.stale > 3) {
        tasks.push({
          title: `Clean up ${analysis.issues.stale} stale issues in ${repoName}`,
          description: `${analysis.issues.stale} issues in ${fullName} have been open for over 30 days. Review and either close outdated issues or prioritize important ones.`,
          priority: 'MEDIUM',
          category: 'tech_debt',
          source: fullName,
        })
      }

      // === TASKS FROM PRs ===
      if (analysis.prs.open > 3) {
        tasks.push({
          title: `Review ${analysis.prs.open} pending PRs in ${repoName}`,
          description: `${analysis.prs.open} pull requests are awaiting review in ${fullName}. Schedule code review sessions to unblock development.`,
          priority: 'HIGH',
          category: 'feature',
          source: fullName,
        })
      }

      // === TASKS FROM COMPLETENESS ===
      for (const missing of analysis.completeness.missingElements) {
        if (missing.includes('TODO count')) {
          // Already handled above
        } else if (!tasks.some(t => t.title.toLowerCase().includes(missing.toLowerCase().substring(0, 10)))) {
          tasks.push({
            title: `Address: ${missing} in ${repoName}`,
            description: `Completeness analysis identified: "${missing}" as an area for improvement in ${fullName}.`,
            priority: 'MEDIUM',
            category: 'tech_debt',
            source: fullName,
          })
        }
      }

      // === BOTTLENECKS ===
      if (analysis.prs.stale > 0) {
        bottlenecks.push({
          type: 'REVIEW_DELAY',
          severity: analysis.prs.stale > 5 ? 'CRITICAL' : analysis.prs.stale > 2 ? 'HIGH' : 'MEDIUM',
          title: `${analysis.prs.stale} stale PRs blocking development in ${repoName}`,
          description: `${analysis.prs.stale} pull requests in ${fullName} have been open for more than 7 days without merge. This is blocking feature delivery and causing code divergence.`,
          impact: `Delaying ${analysis.prs.stale} features/fixes from reaching production. Risk of merge conflicts increasing daily.`,
        })
      }

      if (analysis.issues.stale > 5) {
        bottlenecks.push({
          type: 'STALE_TASK',
          severity: analysis.issues.stale > 10 ? 'HIGH' : 'MEDIUM',
          title: `${analysis.issues.stale} stale issues accumulating in ${repoName}`,
          description: `${analysis.issues.stale} issues in ${fullName} have been open for over 30 days. This backlog indicates either capacity issues or poor issue management.`,
          impact: 'Growing backlog creates planning uncertainty and may hide important bugs.',
        })
      }

      if (!analysis.structure.hasCI && analysis.prs.open > 0) {
        bottlenecks.push({
          type: 'CI_FAILURE',
          severity: 'HIGH',
          title: `No CI pipeline to validate PRs in ${repoName}`,
          description: `${fullName} has ${analysis.prs.open} open PRs but no CI/CD pipeline. Code is being merged without automated testing or validation.`,
          impact: 'High risk of bugs and regressions reaching production. Manual testing is slow and error-prone.',
        })
      }

      if (analysis.completeness.score < 40) {
        bottlenecks.push({
          type: 'DEPENDENCY_BLOCK',
          severity: 'HIGH',
          title: `Critical technical debt in ${repoName}`,
          description: `${fullName} has a completeness score of only ${analysis.completeness.score}%. Missing: ${analysis.completeness.missingElements.slice(0, 3).join(', ')}.`,
          impact: 'Low code quality slows development and increases bug risk.',
        })
      }

      // === PREDICTIONS ===
      if (analysis.completeness.score < 50) {
        predictions.push({
          type: 'DEADLINE_RISK',
          confidence: 0.75,
          reasoning: `${fullName} has a low completeness score (${analysis.completeness.score}%) indicating significant technical debt. This typically results in 20-40% slower feature delivery.`,
          value: {
            riskLevel: analysis.completeness.score < 30 ? 'critical' : 'high',
            repository: fullName,
            estimatedDelayDays: Math.round((100 - analysis.completeness.score) / 10),
          },
        })
      }

      if (analysis.codeInsights.totalTodos > 15) {
        predictions.push({
          type: 'SCOPE_CREEP',
          confidence: 0.7,
          reasoning: `${fullName} has ${analysis.codeInsights.totalTodos} unresolved TODO/FIXME comments. High TODO count often indicates features were shipped incomplete.`,
          value: {
            severity: analysis.codeInsights.totalTodos > 30 ? 'severe' : 'moderate',
            percentageIncrease: Math.min(50, analysis.codeInsights.totalTodos * 2),
            repository: fullName,
          },
        })
      }

      if (analysis.prs.avgMergeTime && analysis.prs.avgMergeTime > 48) {
        predictions.push({
          type: 'VELOCITY_FORECAST',
          confidence: 0.65,
          reasoning: `Average PR merge time in ${fullName} is ${analysis.prs.avgMergeTime} hours. Long merge times slow iteration speed.`,
          value: {
            trend: 'decreasing',
            predictedVelocity: Math.max(2, 10 - Math.floor(analysis.prs.avgMergeTime / 24)),
            currentMergeTimeHours: analysis.prs.avgMergeTime,
          },
        })
      }

      // === SUGGESTED PROJECTS ===
      if (analysis.repo.description && !suggestedProjects.some(p => p.basedOnRepo === fullName)) {
        const key = repoName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4) || 'PROJ'
        suggestedProjects.push({
          name: repoName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          key: key,
          description: analysis.repo.description || `Project for ${repoName}`,
          basedOnRepo: fullName,
        })
      }
    }

    // Calculate average completeness
    if (repoAnalyses.length > 0) {
      avgCompleteness = Math.round(avgCompleteness / repoAnalyses.length)
    }

    // === OVERALL INSIGHTS ===
    insights.push(`Analyzed ${repoAnalyses.length} repositories with an average completeness score of ${avgCompleteness}%`)

    if (totalTodos > 0) {
      insights.push(`Found ${totalTodos} TODO/FIXME/HACK comments across all repos that need attention`)
    }

    if (totalOpenPRs > 0) {
      insights.push(`${totalOpenPRs} pull requests are open (${totalStalePRs} are stale >7 days)`)
    }

    if (totalOpenIssues > 0) {
      insights.push(`${totalOpenIssues} issues are open (${totalBugs} bugs, ${totalStaleIssues} stale >30 days)`)
    }

    const reposWithoutTests = repoAnalyses.filter(r => !r.structure.hasTests).length
    if (reposWithoutTests > 0) {
      insights.push(`${reposWithoutTests} of ${repoAnalyses.length} repos are missing test suites`)
    }

    const reposWithoutCI = repoAnalyses.filter(r => !r.structure.hasCI).length
    if (reposWithoutCI > 0) {
      insights.push(`${reposWithoutCI} repos lack CI/CD pipelines - high risk of production bugs`)
    }

    // Add velocity prediction if we have PR data
    if (totalOpenPRs > 0) {
      predictions.push({
        type: 'VELOCITY_FORECAST',
        confidence: 0.6,
        reasoning: `Based on ${totalOpenPRs} open PRs and ${totalStalePRs} stale PRs, team velocity appears ${totalStalePRs > totalOpenPRs / 2 ? 'decreasing' : 'stable'}.`,
        value: {
          trend: totalStalePRs > totalOpenPRs / 2 ? 'decreasing' : 'stable',
          predictedVelocity: Math.max(3, 10 - totalStalePRs),
          openPRs: totalOpenPRs,
          stalePRs: totalStalePRs,
        },
      })
    }

    // Add burnout prediction if workload is high
    if (totalOpenIssues > 20 || totalOpenPRs > 10) {
      predictions.push({
        type: 'BURNOUT_INDICATOR',
        confidence: 0.55,
        reasoning: `High workload detected: ${totalOpenIssues} open issues and ${totalOpenPRs} open PRs. This volume may lead to team burnout if not managed.`,
        value: {
          riskLevel: totalOpenIssues > 40 ? 'high' : 'medium',
          openIssues: totalOpenIssues,
          openPRs: totalOpenPRs,
          recommendation: 'Consider prioritizing ruthlessly or adding team capacity',
        },
      })
    }

    return { tasks, bottlenecks, predictions, suggestedProjects, overallInsights: insights }
  }

  private async generateAIInsights(
    ai: Anthropic,
    repoAnalyses: GitHubRepoAnalysis[],
    projectContext: ProjectContext | null
  ): Promise<{
    tasks: GeneratedTask[]
    bottlenecks: GeneratedBottleneck[]
    predictions: GeneratedPrediction[]
    suggestedProjects: Array<{ name: string; key: string; description: string; basedOnRepo: string }>
    overallInsights: string[]
  }> {
    const repoSummaries = repoAnalyses.map(r => ({
      name: r.repo.fullName,
      description: r.repo.description,
      language: r.repo.language,
      completeness: r.completeness.score,
      missingElements: r.completeness.missingElements,
      todoCount: r.codeInsights.totalTodos,
      openIssues: r.issues.open,
      bugCount: r.issues.bugCount,
      openPRs: r.prs.open,
      stalePRs: r.prs.stale,
    }))

    const prompt = `You are an AI engineering manager analyzing GitHub repositories.

${projectContext ? `## Project Context
Building: ${projectContext.buildingDescription}
Goals: ${projectContext.goals.join(', ')}
Tech Stack: ${projectContext.techStack.join(', ')}
` : ''}

## Repository Data
${JSON.stringify(repoSummaries, null, 2)}

Generate actionable insights. Return JSON only:
\`\`\`json
{
  "tasks": [{"title": "...", "description": "...", "priority": "HIGH", "category": "bug", "source": "repo-name"}],
  "bottlenecks": [{"type": "REVIEW_DELAY", "severity": "HIGH", "title": "...", "description": "...", "impact": "..."}],
  "predictions": [{"type": "DEADLINE_RISK", "confidence": 0.8, "reasoning": "...", "value": {"riskLevel": "high"}}],
  "suggestedProjects": [],
  "overallInsights": ["insight 1", "insight 2"]
}
\`\`\`

Generate at least 5 tasks, 2 bottlenecks, 2 predictions, and 3 insights based on the actual data.`

    const response = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content.text)

    return {
      tasks: parsed.tasks || [],
      bottlenecks: parsed.bottlenecks || [],
      predictions: parsed.predictions || [],
      suggestedProjects: parsed.suggestedProjects || [],
      overallInsights: parsed.overallInsights || [],
    }
  }

  private async createProjects(
    suggestedProjects: Array<{ name: string; key: string; description: string; basedOnRepo: string }>
  ): Promise<number> {
    let created = 0

    // Get existing projects
    const existingProjects = await prisma.project.findMany({
      where: { organizationId: this.organizationId },
      select: { key: true, name: true },
    })
    const existingKeys = new Set(existingProjects.map(p => p.key.toUpperCase()))
    const existingNames = new Set(existingProjects.map(p => p.name.toLowerCase()))

    for (const project of suggestedProjects) {
      const key = project.key.toUpperCase()
      if (existingKeys.has(key) || existingNames.has(project.name.toLowerCase())) continue

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
        // Use a hash of title to check for duplicates more loosely
        const titleStart = task.title.substring(0, 40).toLowerCase()

        const existing = await prisma.task.findFirst({
          where: {
            organizationId: this.organizationId,
            title: { startsWith: task.title.substring(0, 30), mode: 'insensitive' },
          },
        })

        if (existing) {
          console.log(`Skipping duplicate task: ${task.title.substring(0, 40)}...`)
          continue
        }

        await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            status: TaskStatus.BACKLOG,
            priority: task.priority as TaskPriority,
            source: TaskSource.INTERNAL,
            labels: [task.category, 'auto-generated', 'repo-analysis'],
            organizationId: this.organizationId,
          },
        })
        created++
      } catch (e) {
        console.error(`Failed to create task "${task.title.substring(0, 30)}...":`, e)
      }
    }

    return created
  }

  private async createBottlenecks(bottlenecks: GeneratedBottleneck[]): Promise<number> {
    let created = 0

    // Find or create a project to link bottlenecks to
    let project = await prisma.project.findFirst({
      where: { organizationId: this.organizationId, status: 'ACTIVE' },
    })

    if (!project) {
      // Create a default project for bottlenecks
      project = await prisma.project.create({
        data: {
          name: 'Engineering Health',
          key: 'ENG',
          description: 'Auto-created project for tracking engineering health metrics',
          status: 'ACTIVE',
          organizationId: this.organizationId,
        },
      })
    }

    for (const bottleneck of bottlenecks) {
      try {
        // Check for similar active bottleneck
        const existing = await prisma.bottleneck.findFirst({
          where: {
            projectId: project.id,
            title: { contains: bottleneck.title.substring(0, 25), mode: 'insensitive' },
            status: 'ACTIVE',
          },
        })

        if (existing) {
          console.log(`Skipping duplicate bottleneck: ${bottleneck.title.substring(0, 40)}...`)
          continue
        }

        await prisma.bottleneck.create({
          data: {
            type: bottleneck.type as BottleneckType,
            severity: bottleneck.severity as BottleneckSeverity,
            title: bottleneck.title,
            description: bottleneck.description,
            impact: bottleneck.impact,
            status: 'ACTIVE',
            projectId: project.id,
          },
        })
        created++
      } catch (e) {
        console.error(`Failed to create bottleneck "${bottleneck.title.substring(0, 30)}...":`, e)
      }
    }

    return created
  }

  private async createPredictions(predictions: GeneratedPrediction[]): Promise<number> {
    let created = 0

    // Find a project to link predictions to
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
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
