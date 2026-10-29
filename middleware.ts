import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define the routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  '/', 
  '/login(.*)', 
  '/signup(.*)',
  '/download(.*)',
  '/leadership(.*)',
  '/events(.*)',
  '/api/leadership/public(.*)',
  '/api/public/events(.*)',
  '/api/webhooks(.*)',
  '/api/mpesa(.*)',
  '/api/payments(.*)'
]);

// Stray zero-width characters (e.g. U+2060 pasted into a link) used to 404 valid routes.
const ZERO_WIDTH_TEST = /[\u200B-\u200F\u2060\uFEFF]/;
const ZERO_WIDTH_GLOBAL = /[\u200B-\u200F\u2060\uFEFF]/g;

export default clerkMiddleware((auth, request) => {
  const url = new URL(request.url);

  // Percent-encoded input keeps the raw character out of pathname, so decode first.
  let decodedPath = url.pathname;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    // Malformed escape sequence: leave the path untouched.
  }
  if (ZERO_WIDTH_TEST.test(decodedPath)) {
    const cleanPath = decodedPath.replace(ZERO_WIDTH_GLOBAL, "");
    return NextResponse.redirect(new URL(`${cleanPath}${url.search}`, url), 308);
  }

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