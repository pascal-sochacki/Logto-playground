import { createTRPCRouter, protectedProcedure } from "../trpc";
import { logtoConfig } from "@/app/logto";
import { getAccessToken } from "@logto/next/server-actions";

export const dataRouter = createTRPCRouter({
  getData: protectedProcedure.query(async () => {
    const token = await getAccessToken(logtoConfig, "https://backend");

    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${token}`);

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
    };

    const request = await fetch(
      "http://localhost:8080/api/data",
      requestOptions,
    );
    console.log(request.statusText);
    const json = await request.json();
    return json;
  }),
});
