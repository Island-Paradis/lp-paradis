import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for:
  // - Payload admin routes
  // - API routes
  // - Next.js internals (_next)
  // - Static files (files with extensions)
  matcher: ['/((?!_next|api|admin|.*\\..*).*)'],
};
