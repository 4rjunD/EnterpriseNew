const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
    }
  });

  console.log('Users in database:');
  for (const user of users) {
    console.log(`- ${user.email} (${user.role})`);
    console.log(`  Has password: ${!!user.password}`);
    if (user.password) {
      // Test if 'admin' password works
      const testAdmin = await bcrypt.compare('admin', user.password);
      const testEmployee = await bcrypt.compare('employee', user.password);
      console.log(`  'admin' matches: ${testAdmin}`);
      console.log(`  'employee' matches: ${testEmployee}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
