"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  criarSessaoDashboard,
  credenciaisDashboardValidas,
  DASHBOARD_COOKIE,
} from "@/lib/dashboard/auth";

export async function entrarDashboard(formData: FormData) {
  const email = String(formData.get("email") || "");
  const senha = String(formData.get("senha") || "");
  if (!credenciaisDashboardValidas(email, senha)) redirect("/dashboard?erro=credenciais");
  await criarSessaoDashboard();
  redirect("/dashboard");
}

export async function sairDashboard() {
  const cookieStore = await cookies();
  cookieStore.set(DASHBOARD_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/dashboard",
    maxAge: 0,
  });
  redirect("/dashboard");
}
