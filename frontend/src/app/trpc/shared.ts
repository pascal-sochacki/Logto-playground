import {
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import superjson from "superjson";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return "http://localhost:3000";
}

export function getUrl() {
  return getBaseUrl() + "/api/trpc";
}

export const transformer = superjson;
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Since queries are prefetched on the server, we set a stale time so that
        // queries aren't immediately refetched on the client
        staleTime: 1000 * 30,
      },
      dehydrate: {
        // include pending queries in dehydration
        // this allows us to prefetch in RSC and
        // send promises over the RSC boundary
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
