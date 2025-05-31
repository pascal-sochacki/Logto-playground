import type { IdTokenClaims } from "@logto/client";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { LogtoClient } from "../LogToClient";

export type CreateContextOptions = {
  idToken?: IdTokenClaims;
  logto: {
    clientId: string;
    clientSecret: string;
  };
};

type context = (opts: CreateContextOptions) => Promise<{
  idToken?: IdTokenClaims;
  logto: LogtoClient;
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
  if (ctx.idToken) {
    return next();
  }
  const error = new TRPCError({ code: "UNAUTHORIZED" });
  throw error;
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
