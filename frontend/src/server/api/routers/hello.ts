import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const helloRouter = createTRPCRouter({
  test: protectedProcedure.output(z.string()).query(() => {
    return "hello world!";
  }),
});
