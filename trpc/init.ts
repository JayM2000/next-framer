import db from "@/db";
// import { users } from "@/db/schemas/usersSchema";
import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";

export const createTRPCContext = cache(async () => {
  const { userId, isAuthenticated } = await auth();

  return {
    clerkUserId: userId,
    isAuthenticated,
  };
});

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(
  async function isAuthed(opts) {
    const { ctx, next } = opts;

    if (!ctx.clerkUserId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authorized, Please do login to have access",
      });
    }

    const { rows } = await db.query(
      `SELECT * FROM users WHERE clerk_id = $1 LIMIT 1`,
      [ctx.clerkUserId]
    );
    const userData = rows?.[0];

    if (!userData) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authorized, unable to get your details from database!",
      });
    }

    // const { success } = await ratelimit.limit(userData.id);
    // if (!success) {
    //   throw new TRPCError({
    //     code: "TOO_MANY_REQUESTS",
    //     message: "Too many request triggered Please try again later!",
    //   });
    // }

    return next({
      ctx: {
        ...ctx,
        userData,
      },
    });
  },
);
