"use client";

import { useEffect } from "react";
import { api } from "../trpc/rq-client";

export default function Page() {
  const query = api.test.test.useQuery();
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((r) => console.log());
  });

  return <div>{query.data}</div>;
}
