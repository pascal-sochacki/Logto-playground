import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const patRouter = createTRPCRouter({
  createPat: protectedProcedure
    .input(z.object({ name: z.string(), expiresAt: z.number() }))

    .mutation(async ({ ctx, input }) => {
      const token = await ctx.logto.getAccessToken(
        "https://default.logto.app/api",
        "all",
      );
      await ctx.logto.createPersonalAccessToken(
        ctx.idToken!.sub,
        {
          expiresAt: input.expiresAt == -1 ? undefined : input.expiresAt,
          name: input.name,
        },
        token.access_token,
      );
      return "ok";
    }),
  list: protectedProcedure
    .output(
      z.array(
        z.object({
          name: z.string(),
          value: z.string(),
          createdAt: z.date(),
          expiresAt: z.date().nullable(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const token = await ctx.logto.getAccessToken(
        "https://default.logto.app/api",
        "all",
      );
      const pats = await ctx.logto.listPersonalAccessTokens(
        ctx.idToken!.sub,
        token.access_token,
      );
      return pats.map((p) => {
        return {
          name: p.name,
          value: p.value,
          expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
          createdAt: new Date(p.createdAt),
        };
      });
    }),
  delete: protectedProcedure
    .input(z.object({ name: z.string() }))

    .mutation(async ({ ctx, input }) => {
      const token = await ctx.logto.getAccessToken(
        "https://default.logto.app/api",
        "all",
      );
      await ctx.logto.deletePersonalAccessToken(
        ctx.idToken!.sub,
        input.name,

        token.access_token,
      );
      return [];
    }),
});
