import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  '/', 
  '/login(.*)', 
  '/signup(.*)',
  '/api/webhooks(.*)'
]);

export default clerkMiddleware((auth, request) => {
  // Protect all routes that are NOT explicitly marked as public above
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run middleware for API routes
    '/(api|trpc)(.*)',
  ],
};
