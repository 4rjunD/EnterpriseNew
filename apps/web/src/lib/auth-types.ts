import { UserRole } from '@nexflow/database'
import 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      role: UserRole
      organizationId: string
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    image: string | null
    role: UserRole
    organizationId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    organizationId: string
  }
}
