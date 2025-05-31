import { helloRouter } from "./routers/hello";
import { patRouter } from "./routers/pats";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  test: helloRouter,
  pats: patRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
