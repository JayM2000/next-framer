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

// Only run middleware where needed — skip static pages, public routes, assets
export const config = {
    matcher: [
        "/(dashboard)(.*)",
        "/(api|trpc)(.*)",
    ],
};
