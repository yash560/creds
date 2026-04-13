import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If the user visits the root route and has cookies (session), redirect to /signin
  // The signin page will handle showing the PIN gate or redirecting to dashboard.
  if (pathname === '/') {
    const hasVaultToken = request.cookies.has('vault_token');
    
    if (hasVaultToken) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
