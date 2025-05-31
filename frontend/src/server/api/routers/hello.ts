import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const helloRouter = createTRPCRouter({
  test: protectedProcedure.output(z.string()).query(async () => {
    const logtoEndpoint = "http://localhost:3001"; // Replace with your Logto endpoint
    const tokenEndpoint = `${logtoEndpoint}/oidc/token`;
    const token = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        resource: `https://default.logto.app/api`,
        scope: "all",
      }).toString(),
    });
    const json = await token.json();
    console.log(json);
    return "hello world!";
  }),
});
