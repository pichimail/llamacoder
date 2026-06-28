"use server";

import { signIn } from "@/lib/auth";

export async function continueWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}
