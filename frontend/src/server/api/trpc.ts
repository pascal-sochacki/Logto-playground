import type { IdTokenClaims } from "@logto/client";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

export type CreateContextOptions = {
  idToken?: IdTokenClaims;
};

type context = (opts: CreateContextOptions) => Promise<{
  idToken?: IdTokenClaims;
}>;

const t = initTRPC.context<context>().create({
  transformer: superjson,

  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  console.log("middleware");
  console.log(ctx.idToken);
  console.log("middleware");
  if (ctx.idToken) {
    return next();
  }
  const error = new TRPCError({ code: "UNAUTHORIZED" });
  throw error;
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
