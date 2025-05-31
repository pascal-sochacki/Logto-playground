import { logtoConfig } from "@/app/logto";
import { appRouter } from "@/server/api/root";
import { CreateContextOptions } from "@/server/api/trpc";
import { LogtoClient } from "@/server/LogToClient";
import { getLogtoContext } from "@logto/next/server-actions";
import {
  type FetchCreateContextFnOptions,
  fetchRequestHandler,
} from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function createInnerTRPCContext(opts: CreateContextOptions) {
  const logtoEndpoint = "http://localhost:3001"; // Replace with your Logto endpoint
  return {
    idToken: opts.idToken,
    logto: new LogtoClient(
      logtoEndpoint,
      opts.logto.clientId,
      opts.logto.clientSecret,
    ),
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

        return createInnerTRPCContext({
          logto: {
            clientId: process.env.CLIENT_ID!,
            clientSecret: process.env.CLIENT_SECRET!,
          },
          idToken: ctx.claims,
        });
      },
  });

export { handler as GET, handler as POST };
