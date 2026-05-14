"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { INVITE_SKIPPED_COOKIE } from "@/lib/setup-cookies";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function skipInviteStepAction() {
  const cookieStore = await cookies();
  cookieStore.set(INVITE_SKIPPED_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  redirect("/app");
}
