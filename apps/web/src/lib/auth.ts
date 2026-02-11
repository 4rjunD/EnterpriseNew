import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@nexflow/database'
import { UserRole } from '@nexflow/database'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // Note: Adapter is only needed for OAuth, not for credentials
  // adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Auth attempt:', credentials?.email)

        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        })

        console.log('User found:', !!user, user?.email)

        if (!user || !user.password) {
          console.log('No user or no password')
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        console.log('Password valid:', isValid)

        if (!isValid) {
          return null
        }

        console.log('Returning user:', user.id)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          organizationId: user.organizationId,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, fetch user data from database
      if (account && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, organizationId: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
        }
      }
      // For credentials sign-in, user object has the data
      if (user) {
        token.id = user.id
        token.role = (user as unknown as { role: UserRole }).role
        token.organizationId = (user as unknown as { organizationId: string }).organizationId
      }
      // Ensure token always has these fields (they persist in JWT)
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.organizationId = token.organizationId as string
      }
      return session
    },
    async signIn({ user, account }) {
      // Handle new OAuth users - create org if needed
      if (account?.provider !== 'credentials') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (!existingUser) {
          // Create default organization for new OAuth users
          const org = await prisma.organization.create({
            data: {
              name: `${user.name}'s Workspace`,
              slug: `ws-${Date.now()}`,
            },
          })

          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              role: UserRole.ADMIN,
              organizationId: org.id,
              onboardingCompleted: false,
            },
          })

          // Create default agent configs for new organization
          await prisma.agentConfig.createMany({
            data: [
              { type: 'TASK_REASSIGNER', organizationId: org.id, enabled: false },
              { type: 'NUDGE_SENDER', organizationId: org.id, enabled: false },
              { type: 'SCOPE_ADJUSTER', organizationId: org.id, enabled: false },
            ],
          })
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}

// Helper to get current user with role check
export async function getCurrentUser() {
  const { getServerSession } = await import('next-auth')
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  })
}

// Role-based access check
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN
}

export function isManager(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.MANAGER
}
