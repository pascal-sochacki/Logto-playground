"use server";

import { logtoConfig } from "@/app/logto";
import { signIn, signOut } from "@logto/next/server-actions";

export async function SignOut() {
  "use server";

  await signOut(logtoConfig);
}

export async function SignIn() {
  "use server";

  await signIn(logtoConfig);
}
