import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  '/', 
  '/login(.*)', 
  '/signup(.*)',
  '/api/webhooks(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  const sessionAuth = await auth();
  
  if (!isPublicRoute(request) && !sessionAuth.userId) {
    // Redirect to login if user is unauthenticated
    const signInUrl = new URL('/login', request.url);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
