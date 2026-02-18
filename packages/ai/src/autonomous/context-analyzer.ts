import { prisma } from '@nexflow/database'
import Anthropic from '@anthropic-ai/sdk'

interface CompanyContext {
  buildingDescription: string
  goals: string[]
  techStack: string[]
  industry: string | null
  companyStage: string | null
  teamDistribution: string | null
  developmentMethod: string | null
  primaryChallenges: string[]
  riskTolerance: string | null
}

interface GeneratedInsights {
  predictions: Array<{
    type: 'DEADLINE_RISK' | 'BURNOUT_INDICATOR' | 'VELOCITY_FORECAST' | 'SCOPE_CREEP'
    title: string
    description: string
    confidence: number
    reasoning: string
    suggestedAction: string
  }>
  bottlenecks: Array<{
    type: 'STUCK_PR' | 'STALE_TASK' | 'DEPENDENCY_BLOCK' | 'REVIEW_DELAY' | 'CI_FAILURE'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    title: string
    description: string
    impact: string
  }>
  risks: Array<{
    category: string
    title: string
    description: string
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH'
    impact: 'LOW' | 'MEDIUM' | 'HIGH'
    mitigation: string
  }>
  recommendations: Array<{
    title: string
    description: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    category: string
  }>
}

/**
 * ContextBasedAnalyzer generates AI-powered predictions, risks, and bottlenecks
 * based solely on company context - no repo data required.
 * This ensures new accounts always have actionable insights.
 */
export class ContextBasedAnalyzer {
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
   * Generate insights based on company context.
   * Returns predictions, bottlenecks, risks, and recommendations.
   */
  async analyze(): Promise<GeneratedInsights> {
    // Get company context
    const context = await prisma.projectContext.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!context) {
      return this.getBaselineInsights()
    }

    // Get team size for context
    const teamSize = await prisma.user.count({
      where: { organizationId: this.organizationId },
    })

    try {
      return await this.generateAIInsights({
        buildingDescription: context.buildingDescription,
        goals: context.goals,
        techStack: context.techStack,
        industry: context.industry,
        companyStage: context.companyStage,
        teamDistribution: context.teamDistribution,
        developmentMethod: context.developmentMethod,
        primaryChallenges: context.primaryChallenges,
        riskTolerance: context.riskTolerance,
      }, teamSize)
    } catch (error) {
      console.error('AI analysis failed, using baseline:', error)
      return this.getBaselineInsights()
    }
  }

  /**
   * Generate AI-powered insights from company context.
   */
  private async generateAIInsights(context: CompanyContext, teamSize: number): Promise<GeneratedInsights> {
    const client = this.getAnthropicClient()

    const prompt = `You are a supportive engineering management advisor analyzing a software team's context. Your goal is to provide balanced, actionable insights — highlight what's going well AND areas to improve.

COMPANY CONTEXT:
- What they're building: ${context.buildingDescription}
- Goals: ${context.goals.length > 0 ? context.goals.join(', ') : 'Not specified'}
- Tech Stack: ${context.techStack.length > 0 ? context.techStack.join(', ') : 'Not specified'}
- Industry: ${context.industry || 'Not specified'}
- Company Stage: ${context.companyStage || 'Not specified'}
- Team Distribution: ${context.teamDistribution || 'Not specified'}
- Development Method: ${context.developmentMethod || 'Not specified'}
- Primary Challenges: ${context.primaryChallenges.length > 0 ? context.primaryChallenges.join(', ') : 'Not specified'}
- Risk Tolerance: ${context.riskTolerance || 'Moderate'}
- Team Size: ${teamSize} members

IMPORTANT GUIDELINES:
- Be encouraging and constructive, not doom-and-gloom. Frame challenges as opportunities.
- Keep titles SHORT (under 8 words). Keep descriptions to 1-2 sentences max.
- Focus on actionable next steps, not catastrophic scenarios.
- Generate EXACTLY ONE prediction per type — no duplicates.
- Confidence should reflect actual data availability (lower when speculative).
- For small teams/solo devs: acknowledge their agility and focus as strengths.
- Avoid repetitive patterns — each insight should be distinct and useful.
- Severity should be proportional: most items should be MEDIUM, with only genuine blockers as HIGH/CRITICAL.

Respond with a JSON object:
{
  "predictions": [
    {
      "type": "DEADLINE_RISK|BURNOUT_INDICATOR|VELOCITY_FORECAST|SCOPE_CREEP",
      "title": "Short actionable title (max 8 words)",
      "description": "1-2 sentence description with specific context",
      "confidence": 0.0-1.0,
      "reasoning": "Brief reasoning (1 sentence)",
      "suggestedAction": "Specific, concrete next step"
    }
  ],
  "bottlenecks": [
    {
      "type": "STUCK_PR|STALE_TASK|DEPENDENCY_BLOCK|REVIEW_DELAY|CI_FAILURE",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "title": "Short title (max 8 words)",
      "description": "1-2 sentence description",
      "impact": "Specific impact in 1 sentence"
    }
  ],
  "risks": [
    {
      "category": "Technical|Process|Team|External",
      "title": "Short title (max 8 words)",
      "description": "1-2 sentence description",
      "likelihood": "LOW|MEDIUM|HIGH",
      "impact": "LOW|MEDIUM|HIGH",
      "mitigation": "Concrete action to take"
    }
  ],
  "recommendations": [
    {
      "title": "Short title (max 8 words)",
      "description": "1-2 sentence actionable recommendation",
      "priority": "HIGH|MEDIUM|LOW",
      "category": "process|tooling|team|architecture"
    }
  ]
}

Generate EXACTLY 4 predictions (one per type: DEADLINE_RISK, BURNOUT_INDICATOR, VELOCITY_FORECAST, SCOPE_CREEP), 2 bottlenecks, 3 risks, and 4 recommendations.
Make them specific to the context — reference their actual tech stack, stage, and challenges. Be helpful, not alarming.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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

    return JSON.parse(jsonMatch[0]) as GeneratedInsights
  }

  /**
   * Get baseline insights when no context or AI fails.
   * These are comprehensive and cover all sections.
   */
  private getBaselineInsights(): GeneratedInsights {
    return {
      predictions: [
        {
          type: 'DEADLINE_RISK',
          title: 'Build buffer into early milestones',
          description: 'New projects take 2-4 weeks to find their rhythm. A small buffer now prevents stress later.',
          confidence: 0.6,
          reasoning: 'Early-stage projects benefit from timeline flexibility.',
          suggestedAction: 'Add a 1-2 week buffer to your next milestone deadline.',
        },
        {
          type: 'VELOCITY_FORECAST',
          title: 'Velocity will stabilize over time',
          description: 'Connect your repos and complete a few sprints for accurate velocity tracking.',
          confidence: 0.5,
          reasoning: 'Insufficient data for velocity prediction yet — connect tools to improve accuracy.',
          suggestedAction: 'Connect GitHub to enable data-driven velocity forecasting.',
        },
        {
          type: 'BURNOUT_INDICATOR',
          title: 'Set sustainable pace early',
          description: 'Early-stage energy is great — channel it by setting clear work boundaries from day one.',
          confidence: 0.4,
          reasoning: 'Sustainable practices are easier to establish early than to fix later.',
          suggestedAction: 'Define core working hours and stick to them. Energy management beats time management.',
        },
        {
          type: 'SCOPE_CREEP',
          title: 'Define feature boundaries upfront',
          description: 'Write acceptance criteria before building. Small scope = faster shipping = better feedback loops.',
          confidence: 0.55,
          reasoning: 'Clear scope is the #1 predictor of on-time delivery.',
          suggestedAction: 'For your next feature, write a 3-bullet acceptance criteria before writing code.',
        },
      ],
      bottlenecks: [
        {
          type: 'REVIEW_DELAY',
          severity: 'MEDIUM',
          title: 'Set up a review workflow',
          description: 'Define how and when code gets reviewed to keep PRs moving.',
          impact: 'Unreviewed PRs create merge conflicts and slow feature delivery.',
        },
        {
          type: 'DEPENDENCY_BLOCK',
          severity: 'LOW',
          title: 'Connect your development tools',
          description: 'Link GitHub, Linear, etc. so NexFlow can provide automated insights.',
          impact: 'Without tool connections, insights are based on context alone rather than real data.',
        },
      ],
      risks: [
        {
          category: 'Process',
          title: 'Document workflows as you go',
          description: 'Capture processes while they\'re fresh. Even lightweight docs save time later.',
          likelihood: 'MEDIUM',
          impact: 'MEDIUM',
          mitigation: 'Spend 15 minutes per week documenting your most common workflows.',
        },
        {
          category: 'Technical',
          title: 'Keep dependencies up to date',
          description: 'Outdated packages accumulate security and compatibility issues over time.',
          likelihood: 'MEDIUM',
          impact: 'MEDIUM',
          mitigation: 'Set up Dependabot or Renovate for automated dependency updates.',
        },
        {
          category: 'External',
          title: 'Plan for third-party outages',
          description: 'Critical external services can go down. Have a fallback plan for your key dependencies.',
          likelihood: 'LOW',
          impact: 'HIGH',
          mitigation: 'Identify your top 3 external dependencies and document what happens if each goes down.',
        },
      ],
      recommendations: [
        {
          title: 'Connect your development tools',
          description: 'Link GitHub to enable automated repo analysis, commit insights, and PR tracking.',
          priority: 'HIGH',
          category: 'tooling',
        },
        {
          title: 'Set up your first milestone',
          description: 'Break your project into 2-4 week milestones. Small wins build momentum.',
          priority: 'HIGH',
          category: 'process',
        },
        {
          title: 'Add automated tests early',
          description: 'Even a few key tests now will save hours of debugging later.',
          priority: 'MEDIUM',
          category: 'tooling',
        },
        {
          title: 'Invite collaborators',
          description: 'NexFlow\'s insights improve with more context. Invite teammates for better predictions.',
          priority: 'MEDIUM',
          category: 'team',
        },
      ],
    }
  }

  /**
   * Save generated insights to database.
   */
  async saveInsights(insights: GeneratedInsights): Promise<{
    predictionsCreated: number
    bottlenecksCreated: number
  }> {
    let predictionsCreated = 0
    let bottlenecksCreated = 0

    // Get or create a default project for org-level insights
    let project = await prisma.project.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!project) {
      const org = await prisma.organization.findUnique({
        where: { id: this.organizationId },
      })
      project = await prisma.project.create({
        data: {
          organizationId: this.organizationId,
          name: 'General',
          key: 'GEN',
          description: 'Default project for organization-wide insights',
        },
      })
    }

    // Save predictions — deduplicate by type (only create if no active prediction of same type exists)
    for (const pred of insights.predictions) {
      const existingOfType = await prisma.prediction.findFirst({
        where: {
          projectId: project.id,
          type: pred.type,
          isActive: true,
        },
      })
      if (existingOfType) continue // Skip — already have this type from a previous step

      await prisma.prediction.create({
        data: {
          projectId: project.id,
          type: pred.type,
          confidence: pred.confidence,
          reasoning: pred.reasoning,
          value: {
            title: pred.title,
            description: pred.description,
            suggestedAction: pred.suggestedAction,
          },
          isActive: true,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        },
      })
      predictionsCreated++
    }

    // Save bottlenecks
    for (const bn of insights.bottlenecks) {
      await prisma.bottleneck.create({
        data: {
          projectId: project.id,
          type: bn.type,
          severity: bn.severity,
          title: bn.title,
          description: bn.description,
          impact: bn.impact,
          status: 'ACTIVE',
        },
      })
      bottlenecksCreated++
    }

    // Store risks and recommendations in knowledge base
    const kb = await prisma.organizationKnowledgeBase.findUnique({
      where: { organizationId: this.organizationId },
    })

    const kbData = {
      recommendations: insights.recommendations as object,
      goalProgress: {
        risks: insights.risks,
        lastAnalyzedAt: new Date().toISOString(),
      } as object,
    }

    if (kb) {
      await prisma.organizationKnowledgeBase.update({
        where: { organizationId: this.organizationId },
        data: kbData,
      })
    } else {
      await prisma.organizationKnowledgeBase.create({
        data: {
          organizationId: this.organizationId,
          ...kbData,
        },
      })
    }

    return { predictionsCreated, bottlenecksCreated }
  }

  /**
   * Run full analysis and save results.
   */
  async run(): Promise<{
    predictionsCreated: number
    bottlenecksCreated: number
    risksGenerated: number
    recommendationsGenerated: number
  }> {
    const insights = await this.analyze()
    const saved = await this.saveInsights(insights)

    return {
      ...saved,
      risksGenerated: insights.risks.length,
      recommendationsGenerated: insights.recommendations.length,
    }
  }
}
