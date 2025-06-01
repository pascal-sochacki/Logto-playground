import { LogtoConfig } from "@logto/client";

export const logtoConfig: LogtoConfig & {
  baseUrl: string;
  cookieSecret: string;
  cookieSecure: boolean;
} = {
  endpoint: "http://localhost:3001/",
  appId: "5fynk6pujqwvsp0xpbgyr",
  appSecret: "WIAvjgz3PFD8AqawkLTPCSdr5AemEuHG",
  baseUrl: "http://localhost:3000", // Change to your own base URL
  cookieSecret: "DJOp9zz1X8i4fnTnN45P2wS7OzsWVLIr", // Auto-generated 32 digit secret
  resources: ["https://backend"],
  scopes: ["read:generic_data"],
  cookieSecure: process.env.NODE_ENV === "production",
};
