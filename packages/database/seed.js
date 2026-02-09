const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'nexflow-demo' },
    update: {},
    create: {
      name: 'NexFlow Demo',
      slug: 'nexflow-demo',
    },
  });
  console.log('Organization created:', org.id);

  // Hash passwords
  const adminPass = await bcrypt.hash('admin', 10);
  const employeePass = await bcrypt.hash('employee', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexflow.io' },
    update: {},
    create: {
      email: 'admin@nexflow.io',
      name: 'Admin User',
      password: adminPass,
      role: 'ADMIN',
      organizationId: org.id,
    },
  });
  console.log('Admin created:', admin.email);

  // Create employee user
  const employee = await prisma.user.upsert({
    where: { email: 'employee@nexflow.io' },
    update: {},
    create: {
      email: 'employee@nexflow.io',
      name: 'Employee User',
      password: employeePass,
      role: 'IC',
      organizationId: org.id,
    },
  });
  console.log('Employee created:', employee.email);

  console.log('\n=== TEST ACCOUNTS CREATED ===');
  console.log('Admin: admin@nexflow.io / admin');
  console.log('Employee: employee@nexflow.io / employee');
}

main().catch(console.error).finally(() => prisma.$disconnect());
