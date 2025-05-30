import { logtoConfig } from "@/app/logto";
import { appRouter } from "@/server/api/root";
import { CreateContextOptions } from "@/server/api/trpc";
import { getLogtoContext } from "@logto/next/server-actions";
import {
  type FetchCreateContextFnOptions,
  fetchRequestHandler,
} from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function createInnerTRPCContext(opts: CreateContextOptions) {
  return {
    idToken: opts.IdToken,
  };
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext:
      async function createTRPCContext({}: FetchCreateContextFnOptions) {
        const ctx = await getLogtoContext(logtoConfig);
        console.log(ctx);

        return createInnerTRPCContext({
          IdToken: ctx.claims,
        });
      },
  });

export { handler as GET, handler as POST };
