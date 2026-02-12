const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ============================================================================
  // Safety checks to prevent polluting real accounts
  // ============================================================================

  // Block in production
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Demo seed is blocked in production environment');
    console.error('Set NODE_ENV=development to run demo seed');
    process.exit(1);
  }

  // Check for real organizations (not demo-org)
  const realOrganizations = await prisma.organization.count({
    where: {
      id: { not: 'demo-org' },
    },
  });

  if (realOrganizations > 0) {
    console.error('ERROR: Real organizations detected in database');
    console.error(`Found ${realOrganizations} non-demo organization(s)`);
    console.error('Demo seed is designed for empty databases or demo-only data');
    console.error('');
    console.error('To proceed anyway, set FORCE_DEMO_SEED=true');

    if (process.env.FORCE_DEMO_SEED !== 'true') {
      process.exit(1);
    }

    console.warn('WARNING: FORCE_DEMO_SEED=true - proceeding despite real data');
  }

  // Check for real integrations with actual tokens
  const realIntegrations = await prisma.integration.count({
    where: {
      organizationId: { not: 'demo-org' },
      accessToken: { not: null },
      status: 'CONNECTED',
    },
  });

  if (realIntegrations > 0) {
    console.warn('WARNING: Real connected integrations detected');
    console.warn('This suggests the database contains real user data');
    if (process.env.FORCE_DEMO_SEED !== 'true') {
      console.error('Demo seed aborted to prevent data pollution');
      console.error('Set FORCE_DEMO_SEED=true to proceed');
      process.exit(1);
    }
    console.warn('FORCE_DEMO_SEED=true - proceeding anyway (demo-org data only)');
  }

  console.log('Safety checks passed');
  console.log('Seeding comprehensive demo data...');

  // ============================================================================
  // Organization (use 'demo-org' to match DEMO_MODE in trpc.ts)
  // ============================================================================
  let org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: { id: 'demo-org', name: 'NexFlow Demo', slug: 'nexflow-demo' },
  });
  console.log('Organization:', org.id);

  // ============================================================================
  // Teams (5 teams)
  // ============================================================================
  const teams = await Promise.all([
    prisma.team.upsert({
      where: { organizationId_name: { organizationId: org.id, name: 'Frontend' } },
      update: {},
      create: { id: 't1', name: 'Frontend', description: 'Web application team', color: '#2563EB', organizationId: org.id },
    }),
    prisma.team.upsert({
      where: { organizationId_name: { organizationId: org.id, name: 'Backend' } },
      update: {},
      create: { id: 't2', name: 'Backend', description: 'API and services team', color: '#16A34A', organizationId: org.id },
    }),
    prisma.team.upsert({
      where: { organizationId_name: { organizationId: org.id, name: 'DevOps' } },
      update: {},
      create: { id: 't3', name: 'DevOps', description: 'Infrastructure team', color: '#D97706', organizationId: org.id },
    }),
    prisma.team.upsert({
      where: { organizationId_name: { organizationId: org.id, name: 'Design' } },
      update: {},
      create: { id: 't4', name: 'Design', description: 'UI/UX team', color: '#9333EA', organizationId: org.id },
    }),
    prisma.team.upsert({
      where: { organizationId_name: { organizationId: org.id, name: 'Mobile' } },
      update: {},
      create: { id: 't5', name: 'Mobile', description: 'Mobile development team', color: '#EC4899', organizationId: org.id },
    }),
  ]);
  console.log('Teams created:', teams.length);

  // ============================================================================
  // Users (12 users with varied roles and statuses)
  // ============================================================================
  const users = [
    { id: 'demo-user', email: 'demo@nexflow.io', name: 'Demo Admin', role: 'ADMIN', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'u1', email: 'sarah@nexflow.io', name: 'Sarah Chen', role: 'ADMIN', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'u2', email: 'mike@nexflow.io', name: 'Mike Johnson', role: 'IC', status: 'ONLINE', timezone: 'America/New_York' },
    { id: 'u3', email: 'alex@nexflow.io', name: 'Alex Rivera', role: 'IC', status: 'BUSY', timezone: 'America/Chicago' },
    { id: 'u4', email: 'jordan@nexflow.io', name: 'Jordan Lee', role: 'MANAGER', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'u5', email: 'emily@nexflow.io', name: 'Emily Wang', role: 'IC', status: 'AWAY', timezone: 'America/New_York' },
    { id: 'u6', email: 'chris@nexflow.io', name: 'Chris Park', role: 'IC', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'u7', email: 'taylor@nexflow.io', name: 'Taylor Smith', role: 'IC', status: 'OFFLINE', timezone: 'America/Denver' },
    { id: 'u8', email: 'morgan@nexflow.io', name: 'Morgan Davis', role: 'IC', status: 'ONLINE', timezone: 'America/New_York' },
    { id: 'u9', email: 'casey@nexflow.io', name: 'Casey Brown', role: 'MANAGER', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'u10', email: 'jamie@nexflow.io', name: 'Jamie Wilson', role: 'IC', status: 'BUSY', timezone: 'Europe/London' },
    { id: 'u11', email: 'riley@nexflow.io', name: 'Riley Martinez', role: 'IC', status: 'ONLINE', timezone: 'America/Chicago' },
    { id: 'u12', email: 'quinn@nexflow.io', name: 'Quinn Anderson', role: 'IC', status: 'AWAY', timezone: 'America/Los_Angeles' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { status: user.status },
      create: { ...user, organizationId: org.id },
    });
  }
  console.log('Users created:', users.length);

  // ============================================================================
  // Team Memberships
  // ============================================================================
  const memberships = [
    // Frontend team
    { id: 'tm1', userId: 'u1', teamId: 't1', role: 'LEAD' },
    { id: 'tm2', userId: 'u3', teamId: 't1', role: 'MEMBER' },
    { id: 'tm3', userId: 'u6', teamId: 't1', role: 'MEMBER' },
    { id: 'tm4', userId: 'u11', teamId: 't1', role: 'MEMBER' },
    // Backend team
    { id: 'tm5', userId: 'u2', teamId: 't2', role: 'MEMBER' },
    { id: 'tm6', userId: 'u5', teamId: 't2', role: 'MEMBER' },
    { id: 'tm7', userId: 'u7', teamId: 't2', role: 'MEMBER' },
    { id: 'tm8', userId: 'u9', teamId: 't2', role: 'LEAD' },
    // DevOps team
    { id: 'tm9', userId: 'u4', teamId: 't3', role: 'LEAD' },
    { id: 'tm10', userId: 'u8', teamId: 't3', role: 'MEMBER' },
    // Design team
    { id: 'tm11', userId: 'u10', teamId: 't4', role: 'LEAD' },
    { id: 'tm12', userId: 'u12', teamId: 't4', role: 'MEMBER' },
    // Mobile team
    { id: 'tm13', userId: 'u3', teamId: 't5', role: 'MEMBER' },
    { id: 'tm14', userId: 'u11', teamId: 't5', role: 'LEAD' },
  ];

  for (const membership of memberships) {
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: membership.userId, teamId: membership.teamId } },
      update: { role: membership.role },
      create: membership,
    });
  }
  console.log('Team memberships created:', memberships.length);

  // ============================================================================
  // Projects (8 projects with varied statuses)
  // ============================================================================
  const now = new Date();
  const projects = [
    { id: 'p1', name: 'Frontend App', key: 'FE', description: 'Main web application built with Next.js', status: 'ACTIVE', teamId: 't1', startDate: new Date('2026-01-01'), targetDate: new Date('2026-03-31') },
    { id: 'p2', name: 'Backend Services', key: 'BE', description: 'API and microservices infrastructure', status: 'ACTIVE', teamId: 't2', startDate: new Date('2026-01-01'), targetDate: new Date('2026-04-30') },
    { id: 'p3', name: 'Infrastructure', key: 'INF', description: 'DevOps and cloud infrastructure', status: 'ACTIVE', teamId: 't3', startDate: new Date('2026-01-15'), targetDate: new Date('2026-02-28') },
    { id: 'p4', name: 'Mobile App', key: 'MOB', description: 'React Native mobile application', status: 'PLANNING', teamId: 't5', startDate: null, targetDate: new Date('2026-06-30') },
    { id: 'p5', name: 'Design System', key: 'DS', description: 'Shared UI component library', status: 'ACTIVE', teamId: 't4', startDate: new Date('2025-12-01'), targetDate: new Date('2026-02-15') },
    { id: 'p6', name: 'Analytics Platform', key: 'ANL', description: 'Data analytics and reporting', status: 'ON_HOLD', teamId: 't2', startDate: new Date('2025-11-01'), targetDate: new Date('2026-05-31') },
    { id: 'p7', name: 'Authentication Service', key: 'AUTH', description: 'SSO and OAuth implementation', status: 'ACTIVE', teamId: 't2', startDate: new Date('2026-01-10'), targetDate: new Date('2026-02-28') },
    { id: 'p8', name: 'Documentation Portal', key: 'DOCS', description: 'Developer documentation site', status: 'PLANNING', teamId: 't4', startDate: null, targetDate: new Date('2026-04-15') },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {},
      create: { ...project, organizationId: org.id },
    });
  }
  console.log('Projects created:', projects.length);

  // ============================================================================
  // Tasks (28 tasks distributed across projects)
  // ============================================================================
  const tasks = [
    // Frontend App (p1) - 8 tasks
    { title: 'Implement user authentication flow', description: 'Add login, signup, and password reset functionality', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'p1', assigneeId: 'u1', storyPoints: 8, labels: ['auth', 'frontend'] },
    { title: 'Fix navigation menu bug on mobile', status: 'TODO', priority: 'MEDIUM', projectId: 'p1', assigneeId: 'u3', storyPoints: 3, labels: ['bug', 'mobile'] },
    { title: 'Add unit tests for auth module', status: 'BACKLOG', priority: 'MEDIUM', projectId: 'p1', storyPoints: 5, labels: ['testing'] },
    { title: 'Create onboarding flow', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'p1', assigneeId: 'u6', storyPoints: 8, labels: ['feature', 'ux'] },
    { title: 'Implement dark mode toggle', status: 'TODO', priority: 'LOW', projectId: 'p1', assigneeId: 'u11', storyPoints: 3, labels: ['ui', 'feature'] },
    { title: 'Optimize bundle size', status: 'IN_REVIEW', priority: 'MEDIUM', projectId: 'p1', assigneeId: 'u3', storyPoints: 5, labels: ['performance'] },
    { title: 'Add keyboard shortcuts', status: 'BACKLOG', priority: 'LOW', projectId: 'p1', storyPoints: 3, labels: ['ux'] },
    { title: 'Implement search functionality', status: 'TODO', priority: 'HIGH', projectId: 'p1', assigneeId: 'u1', storyPoints: 8, labels: ['feature'] },

    // Backend Services (p2) - 7 tasks
    { title: 'API rate limiting implementation', description: 'Implement rate limiting for all API endpoints', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'p2', assigneeId: 'u2', storyPoints: 5, isStale: true, labels: ['backend', 'security'] },
    { title: 'Database query optimization', status: 'TODO', priority: 'URGENT', projectId: 'p2', assigneeId: 'u5', storyPoints: 8, dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), labels: ['performance', 'database'] },
    { title: 'Implement webhook handlers', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: 'p2', assigneeId: 'u2', storyPoints: 5, labels: ['integrations'] },
    { title: 'Refactor payment module', status: 'BACKLOG', priority: 'MEDIUM', projectId: 'p2', storyPoints: 13, labels: ['refactor', 'payments'] },
    { title: 'Add GraphQL subscriptions', status: 'TODO', priority: 'MEDIUM', projectId: 'p2', assigneeId: 'u7', storyPoints: 8, labels: ['graphql', 'realtime'] },
    { title: 'Implement caching layer', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'p2', assigneeId: 'u9', storyPoints: 8, labels: ['performance'] },
    { title: 'Add request logging middleware', status: 'DONE', priority: 'LOW', projectId: 'p2', assigneeId: 'u5', storyPoints: 3, labels: ['observability'] },

    // Infrastructure (p3) - 5 tasks
    { title: 'Set up CI/CD pipeline', status: 'DONE', priority: 'HIGH', projectId: 'p3', assigneeId: 'u4', storyPoints: 5, labels: ['devops'] },
    { title: 'Setup monitoring dashboards', status: 'TODO', priority: 'HIGH', projectId: 'p3', assigneeId: 'u8', storyPoints: 5, labels: ['monitoring'] },
    { title: 'Configure auto-scaling', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: 'p3', assigneeId: 'u4', storyPoints: 5, labels: ['infrastructure'] },
    { title: 'Set up staging environment', status: 'DONE', priority: 'HIGH', projectId: 'p3', assigneeId: 'u8', storyPoints: 3, labels: ['infrastructure'] },
    { title: 'Implement disaster recovery plan', status: 'BACKLOG', priority: 'MEDIUM', projectId: 'p3', storyPoints: 8, labels: ['security', 'infrastructure'] },

    // Design System (p5) - 4 tasks
    { title: 'Design system documentation', status: 'IN_REVIEW', priority: 'LOW', projectId: 'p5', assigneeId: 'u10', storyPoints: 3, labels: ['docs'] },
    { title: 'Update color palette', status: 'DONE', priority: 'LOW', projectId: 'p5', assigneeId: 'u10', storyPoints: 2, labels: ['design'] },
    { title: 'Create button component variants', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: 'p5', assigneeId: 'u12', storyPoints: 5, labels: ['components'] },
    { title: 'Add icon library', status: 'TODO', priority: 'MEDIUM', projectId: 'p5', assigneeId: 'u10', storyPoints: 5, labels: ['design', 'components'] },

    // Auth Service (p7) - 4 tasks
    { title: 'Implement OAuth2 flow', status: 'IN_PROGRESS', priority: 'URGENT', projectId: 'p7', assigneeId: 'u9', storyPoints: 13, dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), labels: ['auth', 'security'] },
    { title: 'Add MFA support', status: 'TODO', priority: 'HIGH', projectId: 'p7', assigneeId: 'u2', storyPoints: 8, labels: ['auth', 'security'] },
    { title: 'Create session management', status: 'IN_REVIEW', priority: 'HIGH', projectId: 'p7', assigneeId: 'u7', storyPoints: 5, labels: ['auth'] },
    { title: 'Add password policies', status: 'BACKLOG', priority: 'MEDIUM', projectId: 'p7', storyPoints: 3, labels: ['auth', 'security'] },
  ];

  // Clear existing demo tasks and create new ones
  await prisma.task.deleteMany({ where: { organizationId: 'demo-org' } });
  for (const task of tasks) {
    await prisma.task.create({
      data: { ...task, source: 'INTERNAL', creatorId: 'u1', organizationId: org.id },
    });
  }
  console.log('Tasks created:', tasks.length);

  // ============================================================================
  // Pull Requests (8 PRs)
  // ============================================================================
  const prs = [
    { title: 'feat: Add user dashboard', number: 142, status: 'OPEN', projectId: 'p1', authorId: 'u1', url: 'https://github.com/nexflow/app/pull/142', externalId: 'demo-gh-142', repository: 'nexflow/app', baseBranch: 'main', headBranch: 'feature/dashboard', isStuck: true, stuckAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), unresolvedComments: 3, additions: 450, deletions: 120 },
    { title: 'fix: Resolve memory leak in worker', number: 143, status: 'OPEN', projectId: 'p2', authorId: 'u2', url: 'https://github.com/nexflow/api/pull/143', externalId: 'demo-gh-143', repository: 'nexflow/api', baseBranch: 'main', headBranch: 'fix/memory-leak', additions: 85, deletions: 42 },
    { title: 'refactor: Optimize bundle size', number: 156, status: 'OPEN', projectId: 'p1', authorId: 'u3', url: 'https://github.com/nexflow/app/pull/156', externalId: 'demo-gh-156', repository: 'nexflow/app', baseBranch: 'main', headBranch: 'refactor/bundle', unresolvedComments: 8, additions: 220, deletions: 380 },
    { title: 'feat: Add login form', number: 140, status: 'MERGED', projectId: 'p1', authorId: 'u1', url: 'https://github.com/nexflow/app/pull/140', mergedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), externalId: 'demo-gh-140', repository: 'nexflow/app', baseBranch: 'main', headBranch: 'feature/login', additions: 320, deletions: 45 },
    { title: 'chore: Update dependencies', number: 138, status: 'MERGED', projectId: 'p3', authorId: 'u4', url: 'https://github.com/nexflow/infra/pull/138', mergedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), externalId: 'demo-gh-138', repository: 'nexflow/infra', baseBranch: 'main', headBranch: 'chore/deps', additions: 150, deletions: 120 },
    { title: 'feat: Add rate limiting', number: 158, status: 'OPEN', projectId: 'p2', authorId: 'u9', url: 'https://github.com/nexflow/api/pull/158', externalId: 'demo-gh-158', repository: 'nexflow/api', baseBranch: 'main', headBranch: 'feature/rate-limit', ciStatus: 'FAILING', additions: 180, deletions: 20 },
    { title: 'fix: Auth token refresh', number: 159, status: 'OPEN', projectId: 'p7', authorId: 'u7', url: 'https://github.com/nexflow/auth/pull/159', externalId: 'demo-gh-159', repository: 'nexflow/auth', baseBranch: 'main', headBranch: 'fix/token-refresh', additions: 65, deletions: 30 },
    { title: 'docs: Update API reference', number: 160, status: 'MERGED', projectId: 'p2', authorId: 'u5', url: 'https://github.com/nexflow/api/pull/160', mergedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), externalId: 'demo-gh-160', repository: 'nexflow/api', baseBranch: 'main', headBranch: 'docs/api-ref', additions: 420, deletions: 180 },
  ];

  for (const pr of prs) {
    await prisma.pullRequest.upsert({
      where: { externalId: pr.externalId },
      update: { ...pr, organizationId: org.id },
      create: { ...pr, organizationId: org.id },
    });
  }
  console.log('PRs created:', prs.length);

  // ============================================================================
  // Bottlenecks (6 bottlenecks with varied types and severities)
  // ============================================================================
  await prisma.bottleneck.deleteMany({ where: { project: { organizationId: 'demo-org' } } });
  const bottlenecks = [
    { title: 'PR #142 stuck in review for 5 days', type: 'STUCK_PR', severity: 'CRITICAL', status: 'ACTIVE', projectId: 'p1', description: 'No reviewer activity since Monday', impact: 'High: Blocks release' },
    { title: 'Task "API Integration" in progress for 12 days', type: 'STALE_TASK', severity: 'HIGH', status: 'ACTIVE', projectId: 'p2', description: 'No commits linked in the last 7 days', impact: 'Medium: Delays sprint goal' },
    { title: '3 tasks blocked by "Database Migration"', type: 'DEPENDENCY_BLOCK', severity: 'CRITICAL', status: 'ACTIVE', projectId: 'p2', description: 'Critical path dependency', impact: 'Critical: 3 downstream tasks blocked' },
    { title: 'PR #156 has 8 unresolved comments', type: 'STUCK_PR', severity: 'MEDIUM', status: 'ACTIVE', projectId: 'p1', description: 'Waiting on author feedback', impact: 'Low: Non-blocking feature' },
    { title: 'CI failing on PR #158', type: 'CI_FAILURE', severity: 'HIGH', status: 'ACTIVE', projectId: 'p2', description: 'Test suite failing after dependency update', impact: 'High: Blocks merge' },
    { title: 'Review delay on auth changes', type: 'REVIEW_DELAY', severity: 'MEDIUM', status: 'ACTIVE', projectId: 'p7', description: 'Security review pending for 3 days', impact: 'Medium: Delays auth feature' },
  ];

  for (const bottleneck of bottlenecks) {
    await prisma.bottleneck.create({ data: bottleneck });
  }
  console.log('Bottlenecks created:', bottlenecks.length);

  // ============================================================================
  // Predictions (8 predictions with varied types)
  // ============================================================================
  await prisma.prediction.deleteMany({ where: { project: { organizationId: 'demo-org' } } });
  const predictions = [
    { type: 'DEADLINE_RISK', confidence: 0.78, value: { title: 'Sprint 23 at risk', riskLevel: 'high', estimatedDelay: 3, factors: ['High velocity gap', '2 critical bottlenecks'], recommendations: ['Consider scope reduction', 'Add resources'] }, reasoning: 'Based on current velocity of 28 points/sprint vs required 42 points, there is a 78% probability of missing the Feb 15 deadline by approximately 3 days.', isActive: true, projectId: 'p1' },
    { type: 'BURNOUT_INDICATOR', confidence: 0.72, value: { title: 'Mike showing burnout signals', userId: 'u2', riskLevel: 'medium', factors: ['12 active tasks', 'Weekend activity detected', 'Late commits'], recommendations: ['Redistribute workload', 'Schedule 1:1'] }, reasoning: 'Mike Johnson has been working extended hours with 12 active tasks assigned. Weekend activity was detected on 3 of the last 4 weekends.', isActive: true, projectId: 'p2' },
    { type: 'VELOCITY_FORECAST', confidence: 0.85, value: { title: 'Team velocity trending up', trend: 'increasing', predictedVelocity: 48, confidenceInterval: { low: 42, high: 54 } }, reasoning: 'Weekly velocity has increased from 35 to 48 tasks over the past 4 weeks. This upward trend is expected to continue based on team capacity and reduced blockers.', isActive: true, projectId: 'p1' },
    { type: 'SCOPE_CREEP', confidence: 0.91, value: { title: 'Scope creep detected', percentageIncrease: 23, originalTasks: 52, currentTasks: 64, factors: ['12 new tasks added since sprint start'] }, reasoning: '12 new tasks have been added since sprint start, representing a 23% increase from original scope. This exceeds the 10% threshold for scope creep detection.', isActive: true, projectId: 'p2' },
    { type: 'DEADLINE_RISK', confidence: 0.45, value: { title: 'Auth service on track', riskLevel: 'low', estimatedDelay: 0, factors: ['Good velocity', 'No blockers'] }, reasoning: 'The authentication service project is progressing well with no significant blockers. Current velocity matches requirements.', isActive: true, projectId: 'p7' },
    { type: 'BURNOUT_INDICATOR', confidence: 0.65, value: { title: 'Casey elevated workload', userId: 'u9', riskLevel: 'low', factors: ['8 active tasks', 'Normal hours'], recommendations: ['Monitor workload'] }, reasoning: 'Casey Brown has elevated task count but working hours remain normal. Monitoring recommended.', isActive: true, projectId: 'p2' },
    { type: 'VELOCITY_FORECAST', confidence: 0.75, value: { title: 'Infrastructure velocity stable', trend: 'stable', predictedVelocity: 18, confidenceInterval: { low: 15, high: 21 } }, reasoning: 'Infrastructure team velocity has remained stable at around 18 tasks per sprint with minimal variance.', isActive: true, projectId: 'p3' },
    { type: 'SCOPE_CREEP', confidence: 0.35, value: { title: 'Design system scope stable', percentageIncrease: 8, originalTasks: 25, currentTasks: 27 }, reasoning: 'Only 2 new tasks added, within acceptable scope change threshold.', isActive: true, projectId: 'p5' },
  ];

  for (const prediction of predictions) {
    await prisma.prediction.create({ data: prediction });
  }
  console.log('Predictions created:', predictions.length);

  // ============================================================================
  // Integrations (4 connected)
  // ============================================================================
  const integrations = [
    { type: 'LINEAR', status: 'CONNECTED', metadata: { workspace: 'nexflow', syncedProjects: 3 } },
    { type: 'GITHUB', status: 'CONNECTED', metadata: { org: 'nexflow', syncedRepos: 5 } },
    { type: 'SLACK', status: 'CONNECTED', metadata: { workspace: 'NexFlow HQ', channels: ['#dev', '#ops'] } },
    { type: 'NOTION', status: 'CONNECTED', metadata: { workspace: 'NexFlow Docs' } },
  ];

  for (const integration of integrations) {
    await prisma.integration.upsert({
      where: { organizationId_type: { organizationId: org.id, type: integration.type } },
      update: { status: integration.status, metadata: integration.metadata },
      create: { ...integration, organizationId: org.id, lastSyncAt: new Date() },
    });
  }
  console.log('Integrations created:', integrations.length);

  // ============================================================================
  // Agent Configs (3 agents)
  // ============================================================================
  const agentConfigData = [
    { type: 'TASK_REASSIGNER', enabled: true, autoApprove: false, thresholds: { maxTasksPerPerson: 8, overloadThreshold: 0.9 }, quietHours: { start: 22, end: 8 } },
    { type: 'NUDGE_SENDER', enabled: true, autoApprove: true, thresholds: { prStaleHours: 48, taskStaleHours: 72 }, quietHours: { start: 20, end: 9 } },
    { type: 'SCOPE_ADJUSTER', enabled: false, autoApprove: false, thresholds: { riskThreshold: 0.7, minConfidence: 0.8 }, quietHours: { start: 22, end: 8 } },
  ];

  const createdAgentConfigs = {};
  for (const config of agentConfigData) {
    const created = await prisma.agentConfig.upsert({
      where: { organizationId_type: { organizationId: org.id, type: config.type } },
      update: { enabled: config.enabled, autoApprove: config.autoApprove, thresholds: config.thresholds, quietHours: config.quietHours },
      create: { ...config, organizationId: org.id },
    });
    createdAgentConfigs[config.type] = created.id;
  }
  console.log('Agent configs created:', agentConfigData.length);

  // ============================================================================
  // Agent Actions (5 actions with varied statuses)
  // ============================================================================
  await prisma.agentAction.deleteMany({ where: { agentConfig: { organizationId: 'demo-org' } } });
  const agentActions = [
    { agentConfigId: createdAgentConfigs['TASK_REASSIGNER'], status: 'PENDING', action: 'reassign', reasoning: 'Mike is overloaded with 12 active tasks', suggestion: { fromUser: 'u2', toUser: 'u5', taskTitle: 'API Integration' }, targetUserId: 'u2' },
    { agentConfigId: createdAgentConfigs['TASK_REASSIGNER'], status: 'PENDING', action: 'reassign', reasoning: 'Alex is on PTO next week', suggestion: { fromUser: 'u3', toUser: 'u6', taskTitle: 'Fix navigation bug' }, targetUserId: 'u3' },
    { agentConfigId: createdAgentConfigs['NUDGE_SENDER'], status: 'EXECUTED', action: 'nudge', reasoning: 'PR #142 has been open for 5 days', result: { sent: true, channel: 'slack', recipient: 'u1' }, executedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), targetUserId: 'u1' },
    { agentConfigId: createdAgentConfigs['TASK_REASSIGNER'], status: 'APPROVED', action: 'reassign', reasoning: 'Rebalancing workload', suggestion: { fromUser: 'u4', toUser: 'u8', taskTitle: 'Setup monitoring' }, approvedBy: 'u4', approvedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), targetUserId: 'u4' },
    { agentConfigId: createdAgentConfigs['NUDGE_SENDER'], status: 'EXECUTED', action: 'nudge', reasoning: 'Daily standup reminder', result: { sent: true, channel: 'slack', recipients: 8 }, executedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
  ];

  for (const action of agentActions) {
    await prisma.agentAction.create({ data: action });
  }
  console.log('Agent actions created:', agentActions.length);

  // ============================================================================
  // Behavioral Metrics (56 records - 14 days for 4 key users)
  // ============================================================================
  await prisma.behavioralMetric.deleteMany({ where: { user: { organizationId: 'demo-org' } } });
  const metricsUsers = ['u1', 'u2', 'u3', 'u9'];
  const metricsData = [];

  for (const userId of metricsUsers) {
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isMike = userId === 'u2';

      metricsData.push({
        userId,
        date,
        source: 'SLACK',
        messageCount: Math.floor(Math.random() * 30) + (isMike ? 40 : 20),
        avgResponseTimeMs: Math.floor(Math.random() * 60000) + 30000,
        activeHoursStart: 9,
        activeHoursEnd: isMike && !isWeekend ? 22 : 18,
        weekendActivity: isWeekend && (isMike || Math.random() > 0.7),
        collaborationScore: Math.floor(Math.random() * 20) + 70,
        communicationHealth: Math.floor(Math.random() * 15) + 75,
      });
    }
  }

  for (const metric of metricsData) {
    await prisma.behavioralMetric.create({ data: metric });
  }
  console.log('Behavioral metrics created:', metricsData.length);

  console.log('\n✅ Comprehensive demo data seeded successfully!');
  console.log('Summary:');
  console.log('  - 1 Organization');
  console.log('  - 5 Teams');
  console.log('  - 12 Users');
  console.log('  - 8 Projects');
  console.log('  - 28 Tasks');
  console.log('  - 8 Pull Requests');
  console.log('  - 6 Bottlenecks');
  console.log('  - 8 Predictions');
  console.log('  - 4 Integrations');
  console.log('  - 3 Agent Configs');
  console.log('  - 5 Agent Actions');
  console.log('  - 56 Behavioral Metrics');
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
