import { withAuth } from 'next-auth/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// Demo mode - bypass auth for UI development
const DEMO_MODE = false

function demoMiddleware(req: NextRequest) {
  return NextResponse.next()
}

const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Public routes
    if (path === '/login' || path === '/signup' || path.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    // Protect dashboard routes
    if (path.startsWith('/dashboard')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Admin-only routes
    const adminOnlyRoutes = ['/dashboard/settings/organization', '/dashboard/integrations/config']
    if (adminOnlyRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Manager+ routes
    const managerRoutes = [
      '/dashboard/predictions',
      '/dashboard/insights',
      '/dashboard/bottlenecks',
      '/dashboard/agents',
    ]
    if (managerRoutes.some((route) => path.startsWith(route))) {
      if (token?.role === 'IC') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Allow public routes
        if (path === '/login' || path === '/signup' || path.startsWith('/api/auth')) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

// In demo mode, skip withAuth entirely to avoid NextAuth configuration errors
export default DEMO_MODE ? demoMiddleware : authMiddleware

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts|images).*)'],
}
