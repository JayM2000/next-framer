import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only protect specific routes
const isProtectedRoute = createRouteMatcher([]);

// Mark webhook and other public routes as public
const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
    // Only protect routes if they match protected list
    if (!isPublicRoute(req) && isProtectedRoute(req)) {
        await auth.protect();
    }
});

// Only run middleware where needed
export const config = {
    matcher: [
        "/((?!_next|favicon.ico|.*\\..*).*)",
        "/(api|trpc)(.*)", // But we'll explicitly skip webhook inside logic
    ],
};
