import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const DASHBOARD_COOKIE = "marketing_dashboard_session";

const DEFAULT_EMAIL = "susanesamt@gmail.com";
const DEFAULT_PASSWORD_HASH = "767bd4c435bb5606ae6cac2236961d0f5e9790f016d722856da213d218c1309e";

function emailPermitido() {
  return (process.env.DASHBOARD_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
}

function passwordHashPermitido() {
  return process.env.DASHBOARD_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
}

function sessionSecret() {
  return process.env.DASHBOARD_SESSION_SECRET || `dashboard-${passwordHashPermitido()}`;
}

function assinatura(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function credenciaisDashboardValidas(email: string, senha: string) {
  const emailOk = email.trim().toLowerCase() === emailPermitido();
  const recebido = createHash("sha256").update(senha).digest();
  const esperado = Buffer.from(passwordHashPermitido(), "hex");
  return emailOk && recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}

export async function criarSessaoDashboard() {
  const expiraEm = Date.now() + 1000 * 60 * 60 * 12;
  const payload = Buffer.from(JSON.stringify({ expiraEm })).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(DASHBOARD_COOKIE, `${payload}.${assinatura(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/dashboard",
    maxAge: 60 * 60 * 12,
  });
}

export async function sessaoDashboardValida() {
  const cookieStore = await cookies();
  const valor = cookieStore.get(DASHBOARD_COOKIE)?.value;
  if (!valor) return false;
  const [payload, recebida] = valor.split(".");
  if (!payload || !recebida) return false;
  const esperada = assinatura(payload);
  const a = Buffer.from(recebida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString()) as { expiraEm?: number };
    return typeof dados.expiraEm === "number" && dados.expiraEm > Date.now();
  } catch {
    return false;
  }
}

