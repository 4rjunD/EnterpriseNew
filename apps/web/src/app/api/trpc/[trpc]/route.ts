import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter, createContext } from '@nexflow/api-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Demo mode bypasses auth for UI development
const DEMO_MODE = true

const handler = async (req: Request) => {
  let userId: string | undefined
  let organizationId: string | undefined
  let role: any

  if (DEMO_MODE) {
    userId = 'demo-user'
    organizationId = 'demo-org'
    role = 'ADMIN'
  } else {
    const session = await getServerSession(authOptions)
    userId = session?.user?.id
    organizationId = session?.user?.organizationId
    role = session?.user?.role
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () =>
      createContext({ userId, organizationId, role }),
  })
}

export { handler as GET, handler as POST }
