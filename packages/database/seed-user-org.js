const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgId = 'cmli3r7a50000dmcein8haoao';
  const now = new Date();

  console.log('Seeding data to Arjun Dixit\'s Workspace...');

  // Teams
  const teamData = [
    { name: 'Frontend', description: 'Web application team', color: '#2563EB' },
    { name: 'Backend', description: 'API and services team', color: '#16A34A' },
    { name: 'DevOps', description: 'Infrastructure team', color: '#D97706' },
    { name: 'Design', description: 'UI/UX team', color: '#9333EA' },
    { name: 'Mobile', description: 'Mobile development team', color: '#EC4899' },
  ];

  const teams = {};
  for (const team of teamData) {
    const created = await prisma.team.upsert({
      where: { organizationId_name: { organizationId: orgId, name: team.name } },
      update: {},
      create: { ...team, organizationId: orgId },
    });
    teams[team.name] = created.id;
  }
  console.log('Teams created:', Object.keys(teams).length);

  // Users
  const users = [
    { id: 'user-sarah', email: 'sarah@company.io', name: 'Sarah Chen', role: 'ADMIN', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'user-mike', email: 'mike@company.io', name: 'Mike Johnson', role: 'IC', status: 'ONLINE', timezone: 'America/New_York' },
    { id: 'user-alex', email: 'alex@company.io', name: 'Alex Rivera', role: 'IC', status: 'BUSY', timezone: 'America/Chicago' },
    { id: 'user-jordan', email: 'jordan@company.io', name: 'Jordan Lee', role: 'MANAGER', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'user-emily', email: 'emily@company.io', name: 'Emily Wang', role: 'IC', status: 'AWAY', timezone: 'America/New_York' },
    { id: 'user-chris', email: 'chris@company.io', name: 'Chris Park', role: 'IC', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'user-taylor', email: 'taylor@company.io', name: 'Taylor Smith', role: 'IC', status: 'OFFLINE', timezone: 'America/Denver' },
    { id: 'user-morgan', email: 'morgan@company.io', name: 'Morgan Davis', role: 'IC', status: 'ONLINE', timezone: 'America/New_York' },
    { id: 'user-casey', email: 'casey@company.io', name: 'Casey Brown', role: 'MANAGER', status: 'ONLINE', timezone: 'America/Los_Angeles' },
    { id: 'user-jamie', email: 'jamie@company.io', name: 'Jamie Wilson', role: 'IC', status: 'BUSY', timezone: 'Europe/London' },
    { id: 'user-riley', email: 'riley@company.io', name: 'Riley Martinez', role: 'IC', status: 'ONLINE', timezone: 'America/Chicago' },
    { id: 'user-quinn', email: 'quinn@company.io', name: 'Quinn Anderson', role: 'IC', status: 'AWAY', timezone: 'America/Los_Angeles' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { status: user.status },
      create: { ...user, organizationId: orgId },
    });
  }
  console.log('Users created:', users.length);

  // Team Memberships
  const memberships = [
    { userId: 'user-sarah', teamName: 'Frontend', role: 'LEAD' },
    { userId: 'user-alex', teamName: 'Frontend', role: 'MEMBER' },
    { userId: 'user-chris', teamName: 'Frontend', role: 'MEMBER' },
    { userId: 'user-riley', teamName: 'Frontend', role: 'MEMBER' },
    { userId: 'user-mike', teamName: 'Backend', role: 'MEMBER' },
    { userId: 'user-emily', teamName: 'Backend', role: 'MEMBER' },
    { userId: 'user-taylor', teamName: 'Backend', role: 'MEMBER' },
    { userId: 'user-casey', teamName: 'Backend', role: 'LEAD' },
    { userId: 'user-jordan', teamName: 'DevOps', role: 'LEAD' },
    { userId: 'user-morgan', teamName: 'DevOps', role: 'MEMBER' },
    { userId: 'user-jamie', teamName: 'Design', role: 'LEAD' },
    { userId: 'user-quinn', teamName: 'Design', role: 'MEMBER' },
    { userId: 'user-alex', teamName: 'Mobile', role: 'MEMBER' },
    { userId: 'user-riley', teamName: 'Mobile', role: 'LEAD' },
  ];

  for (const m of memberships) {
    const teamId = teams[m.teamName];
    await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: m.userId, teamId } },
      update: { role: m.role },
      create: { userId: m.userId, teamId, role: m.role },
    });
  }
  console.log('Team memberships created:', memberships.length);

  // Projects
  const projectData = [
    { name: 'Frontend App', key: 'FE', description: 'Main web application', status: 'ACTIVE', teamName: 'Frontend', startDate: new Date('2026-01-01'), targetDate: new Date('2026-03-31') },
    { name: 'Backend Services', key: 'BE', description: 'API and microservices', status: 'ACTIVE', teamName: 'Backend', startDate: new Date('2026-01-01'), targetDate: new Date('2026-04-30') },
    { name: 'Infrastructure', key: 'INF', description: 'DevOps and cloud', status: 'ACTIVE', teamName: 'DevOps', startDate: new Date('2026-01-15'), targetDate: new Date('2026-02-28') },
    { name: 'Mobile App', key: 'MOB', description: 'React Native app', status: 'PLANNING', teamName: 'Mobile', targetDate: new Date('2026-06-30') },
    { name: 'Design System', key: 'DS', description: 'Shared UI library', status: 'ACTIVE', teamName: 'Design', startDate: new Date('2025-12-01'), targetDate: new Date('2026-02-15') },
    { name: 'Auth Service', key: 'AUTH', description: 'SSO and OAuth', status: 'ACTIVE', teamName: 'Backend', startDate: new Date('2026-01-10'), targetDate: new Date('2026-02-28') },
  ];

  const projects = {};
  for (const proj of projectData) {
    const { teamName, ...projData } = proj;
    const created = await prisma.project.upsert({
      where: { organizationId_key: { organizationId: orgId, key: proj.key } },
      update: {},
      create: { ...projData, teamId: teams[teamName], organizationId: orgId },
    });
    projects[proj.name] = created.id;
  }
  console.log('Projects created:', Object.keys(projects).length);

  // Tasks
  const taskData = [
    { title: 'Implement user authentication flow', description: 'Add login, signup, and password reset', status: 'IN_PROGRESS', priority: 'HIGH', projectName: 'Frontend App', assigneeId: 'user-sarah', storyPoints: 8, labels: ['auth', 'frontend'] },
    { title: 'Fix navigation menu bug on mobile', status: 'TODO', priority: 'MEDIUM', projectName: 'Frontend App', assigneeId: 'user-alex', storyPoints: 3, labels: ['bug', 'mobile'] },
    { title: 'Create onboarding flow', status: 'IN_PROGRESS', priority: 'HIGH', projectName: 'Frontend App', assigneeId: 'user-chris', storyPoints: 8, labels: ['feature', 'ux'] },
    { title: 'Implement dark mode toggle', status: 'TODO', priority: 'LOW', projectName: 'Frontend App', assigneeId: 'user-riley', storyPoints: 3, labels: ['ui'] },
    { title: 'Optimize bundle size', status: 'IN_REVIEW', priority: 'MEDIUM', projectName: 'Frontend App', assigneeId: 'user-alex', storyPoints: 5, labels: ['performance'] },
    { title: 'API rate limiting implementation', description: 'Implement rate limiting for all API endpoints', status: 'IN_PROGRESS', priority: 'HIGH', projectName: 'Backend Services', assigneeId: 'user-mike', storyPoints: 5, isStale: true, labels: ['backend', 'security'] },
    { title: 'Database query optimization', status: 'TODO', priority: 'URGENT', projectName: 'Backend Services', assigneeId: 'user-emily', storyPoints: 8, dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), labels: ['performance', 'database'] },
    { title: 'Implement webhook handlers', status: 'IN_PROGRESS', priority: 'MEDIUM', projectName: 'Backend Services', assigneeId: 'user-mike', storyPoints: 5, labels: ['integrations'] },
    { title: 'Implement caching layer', status: 'IN_PROGRESS', priority: 'HIGH', projectName: 'Backend Services', assigneeId: 'user-casey', storyPoints: 8, labels: ['performance'] },
    { title: 'Set up CI/CD pipeline', status: 'DONE', priority: 'HIGH', projectName: 'Infrastructure', assigneeId: 'user-jordan', storyPoints: 5, labels: ['devops'] },
    { title: 'Setup monitoring dashboards', status: 'TODO', priority: 'HIGH', projectName: 'Infrastructure', assigneeId: 'user-morgan', storyPoints: 5, labels: ['monitoring'] },
    { title: 'Configure auto-scaling', status: 'IN_PROGRESS', priority: 'MEDIUM', projectName: 'Infrastructure', assigneeId: 'user-jordan', storyPoints: 5, labels: ['infrastructure'] },
    { title: 'Design system documentation', status: 'IN_REVIEW', priority: 'LOW', projectName: 'Design System', assigneeId: 'user-jamie', storyPoints: 3, labels: ['docs'] },
    { title: 'Create button component variants', status: 'IN_PROGRESS', priority: 'MEDIUM', projectName: 'Design System', assigneeId: 'user-quinn', storyPoints: 5, labels: ['components'] },
    { title: 'Implement OAuth2 flow', status: 'IN_PROGRESS', priority: 'URGENT', projectName: 'Auth Service', assigneeId: 'user-casey', storyPoints: 13, dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), labels: ['auth', 'security'] },
    { title: 'Add MFA support', status: 'TODO', priority: 'HIGH', projectName: 'Auth Service', assigneeId: 'user-mike', storyPoints: 8, labels: ['auth', 'security'] },
  ];

  await prisma.task.deleteMany({ where: { organizationId: orgId } });
  for (const task of taskData) {
    const { projectName, ...taskFields } = task;
    await prisma.task.create({
      data: { ...taskFields, projectId: projects[projectName], source: 'INTERNAL', creatorId: 'user-sarah', organizationId: orgId },
    });
  }
  console.log('Tasks created:', taskData.length);

  // Pull Requests
  const prData = [
    { title: 'feat: Add user dashboard', number: 142, status: 'OPEN', projectName: 'Frontend App', authorId: 'user-sarah', url: 'https://github.com/company/app/pull/142', externalId: 'real-gh-142', repository: 'company/app', baseBranch: 'main', headBranch: 'feature/dashboard', isStuck: true, stuckAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), unresolvedComments: 3, additions: 450, deletions: 120 },
    { title: 'fix: Resolve memory leak in worker', number: 143, status: 'OPEN', projectName: 'Backend Services', authorId: 'user-mike', url: 'https://github.com/company/api/pull/143', externalId: 'real-gh-143', repository: 'company/api', baseBranch: 'main', headBranch: 'fix/memory-leak', additions: 85, deletions: 42 },
    { title: 'refactor: Optimize bundle size', number: 156, status: 'OPEN', projectName: 'Frontend App', authorId: 'user-alex', url: 'https://github.com/company/app/pull/156', externalId: 'real-gh-156', repository: 'company/app', baseBranch: 'main', headBranch: 'refactor/bundle', unresolvedComments: 8, additions: 220, deletions: 380 },
    { title: 'feat: Add login form', number: 140, status: 'MERGED', projectName: 'Frontend App', authorId: 'user-sarah', url: 'https://github.com/company/app/pull/140', mergedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), externalId: 'real-gh-140', repository: 'company/app', baseBranch: 'main', headBranch: 'feature/login', additions: 320, deletions: 45 },
    { title: 'feat: Add rate limiting', number: 158, status: 'OPEN', projectName: 'Backend Services', authorId: 'user-casey', url: 'https://github.com/company/api/pull/158', externalId: 'real-gh-158', repository: 'company/api', baseBranch: 'main', headBranch: 'feature/rate-limit', ciStatus: 'FAILING', additions: 180, deletions: 20 },
  ];

  for (const pr of prData) {
    const { projectName, ...prFields } = pr;
    await prisma.pullRequest.upsert({
      where: { externalId: pr.externalId },
      update: { ...prFields, projectId: projects[projectName], organizationId: orgId },
      create: { ...prFields, projectId: projects[projectName], organizationId: orgId },
    });
  }
  console.log('PRs created:', prData.length);

  // Bottlenecks
  await prisma.bottleneck.deleteMany({ where: { project: { organizationId: orgId } } });
  const bottleneckData = [
    { title: 'PR #142 stuck in review for 5 days', type: 'STUCK_PR', severity: 'CRITICAL', status: 'ACTIVE', projectName: 'Frontend App', description: 'No reviewer activity since Monday', impact: 'High: Blocks release' },
    { title: 'Task "API Integration" in progress for 12 days', type: 'STALE_TASK', severity: 'HIGH', status: 'ACTIVE', projectName: 'Backend Services', description: 'No commits linked in the last 7 days', impact: 'Medium: Delays sprint goal' },
    { title: '3 tasks blocked by "Database Migration"', type: 'DEPENDENCY_BLOCK', severity: 'CRITICAL', status: 'ACTIVE', projectName: 'Backend Services', description: 'Critical path dependency', impact: 'Critical: 3 downstream tasks blocked' },
    { title: 'PR #156 has 8 unresolved comments', type: 'STUCK_PR', severity: 'MEDIUM', status: 'ACTIVE', projectName: 'Frontend App', description: 'Waiting on author feedback', impact: 'Low: Non-blocking feature' },
    { title: 'CI failing on PR #158', type: 'CI_FAILURE', severity: 'HIGH', status: 'ACTIVE', projectName: 'Backend Services', description: 'Test suite failing after dependency update', impact: 'High: Blocks merge' },
  ];

  for (const b of bottleneckData) {
    const { projectName, ...bFields } = b;
    await prisma.bottleneck.create({ data: { ...bFields, projectId: projects[projectName] } });
  }
  console.log('Bottlenecks created:', bottleneckData.length);

  // Predictions
  await prisma.prediction.deleteMany({ where: { project: { organizationId: orgId } } });
  const predictionData = [
    { type: 'DEADLINE_RISK', confidence: 0.78, value: { title: 'Sprint 23 at risk', riskLevel: 'high', estimatedDelay: 3, factors: ['High velocity gap', '2 critical bottlenecks'], recommendations: ['Consider scope reduction', 'Add resources'] }, reasoning: 'Based on current velocity of 28 points/sprint vs required 42 points, there is a 78% probability of missing the Feb 15 deadline.', isActive: true, projectName: 'Frontend App' },
    { type: 'BURNOUT_INDICATOR', confidence: 0.72, value: { title: 'Mike showing burnout signals', userId: 'user-mike', riskLevel: 'medium', factors: ['12 active tasks', 'Weekend activity detected', 'Late commits'], recommendations: ['Redistribute workload', 'Schedule 1:1'] }, reasoning: 'Mike Johnson has been working extended hours with high task load.', isActive: true, projectName: 'Backend Services' },
    { type: 'VELOCITY_FORECAST', confidence: 0.85, value: { title: 'Team velocity trending up', trend: 'increasing', predictedVelocity: 48, confidenceInterval: { low: 42, high: 54 } }, reasoning: 'Weekly velocity has increased from 35 to 48 tasks over the past 4 weeks.', isActive: true, projectName: 'Frontend App' },
    { type: 'SCOPE_CREEP', confidence: 0.91, value: { title: 'Scope creep detected', percentageIncrease: 23, originalTasks: 52, currentTasks: 64, factors: ['12 new tasks added since sprint start'] }, reasoning: '12 new tasks have been added since sprint start, representing a 23% increase.', isActive: true, projectName: 'Backend Services' },
  ];

  for (const p of predictionData) {
    const { projectName, ...pFields } = p;
    await prisma.prediction.create({ data: { ...pFields, projectId: projects[projectName] } });
  }
  console.log('Predictions created:', predictionData.length);

  // Behavioral Metrics for all users
  await prisma.behavioralMetric.deleteMany({ where: { user: { organizationId: orgId } } });

  const userProfiles = {
    'user-sarah': { baseActivity: 45, workStyle: 'high-performer' },
    'user-mike': { baseActivity: 65, workStyle: 'overworked' },
    'user-alex': { baseActivity: 35, workStyle: 'steady' },
    'user-jordan': { baseActivity: 40, workStyle: 'manager' },
    'user-emily': { baseActivity: 25, workStyle: 'away' },
    'user-chris': { baseActivity: 50, workStyle: 'high-performer' },
    'user-taylor': { baseActivity: 20, workStyle: 'offline' },
    'user-morgan': { baseActivity: 42, workStyle: 'steady' },
    'user-casey': { baseActivity: 48, workStyle: 'manager' },
    'user-jamie': { baseActivity: 55, workStyle: 'busy' },
    'user-riley': { baseActivity: 38, workStyle: 'steady' },
    'user-quinn': { baseActivity: 30, workStyle: 'away' },
  };

  const metricsData = [];

  for (const userId of Object.keys(userProfiles)) {
    const profile = userProfiles[userId];
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const dayVariation = Math.floor(Math.random() * 20) - 10;

      let messageCount = profile.baseActivity + dayVariation;
      let activeHoursEnd = 18;
      let weekendActivity = false;
      let collaborationScore = 75 + Math.floor(Math.random() * 20);
      let communicationHealth = 80 + Math.floor(Math.random() * 15);

      switch (profile.workStyle) {
        case 'overworked':
          messageCount += 20;
          activeHoursEnd = isWeekend ? 16 : 22;
          weekendActivity = isWeekend && Math.random() > 0.3;
          collaborationScore = 60 + Math.floor(Math.random() * 15);
          communicationHealth = 55 + Math.floor(Math.random() * 20);
          break;
        case 'high-performer':
          activeHoursEnd = 19;
          collaborationScore = 85 + Math.floor(Math.random() * 10);
          communicationHealth = 88 + Math.floor(Math.random() * 10);
          break;
        case 'manager':
          messageCount += 10;
          activeHoursEnd = 19;
          collaborationScore = 90 + Math.floor(Math.random() * 8);
          break;
        case 'busy':
          messageCount += 15;
          activeHoursEnd = 20;
          weekendActivity = isWeekend && Math.random() > 0.5;
          break;
        case 'away':
          messageCount = Math.max(5, messageCount - 15);
          activeHoursEnd = 17;
          collaborationScore = 50 + Math.floor(Math.random() * 20);
          break;
        case 'offline':
          messageCount = Math.max(0, messageCount - 20);
          activeHoursEnd = 17;
          collaborationScore = 40 + Math.floor(Math.random() * 25);
          communicationHealth = 60 + Math.floor(Math.random() * 20);
          break;
      }

      if (isWeekend && profile.workStyle !== 'overworked') {
        messageCount = Math.floor(messageCount * 0.3);
      }

      metricsData.push({
        userId,
        date,
        source: 'SLACK',
        messageCount: Math.max(0, messageCount),
        avgResponseTimeMs: Math.floor(Math.random() * 60000) + 30000,
        activeHoursStart: 9,
        activeHoursEnd,
        weekendActivity,
        collaborationScore: Math.min(100, Math.max(0, collaborationScore)),
        communicationHealth: Math.min(100, Math.max(0, communicationHealth)),
      });
    }
  }

  for (const m of metricsData) {
    await prisma.behavioralMetric.create({ data: m });
  }
  console.log('Behavioral metrics created:', metricsData.length);

  console.log('\n✅ Data seeded to your account successfully!');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
