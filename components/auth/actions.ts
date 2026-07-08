"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Resultado padrão das actions de auth ({ ok, error } — convenção do projeto). */
export type ResultadoAuth = { ok: true } | { ok: false; error: string };

/**
 * Encerra a sessão (limpa os cookies de auth) e volta para /login.
 * Usada como action do <form> do botão Sair no HeaderLogado.
 * Falha do signOut é logada mas não bloqueia o redirect: o usuário pediu
 * para sair e a pior consequência é a sessão expirar sozinha depois.
 */
export async function sair(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("sair: falha no signOut do Supabase:", error.message);
  }
  redirect("/login");
}
