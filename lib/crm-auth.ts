import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function authorized() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, reason: "session-missing" } as const;
    const allowedEmails = `${process.env.CRM_ALLOWED_EMAIL || ""},susanesamt@gmail.com`
      .replace(/["']/g, "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (allowedEmails.includes(user.email.trim().toLowerCase())) return { ok: true, userId: user.id, isAdmin: true, permissions: ["geral", "comercial", "trafego", "campanhas", "pipeline", "contatos", "financeiro", "mensagens"] } as const;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin, crm_access, crm_is_admin, crm_permissions")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_super_admin) return { ok: true, userId: user.id, isAdmin: true, permissions: ["geral", "comercial", "trafego", "campanhas", "pipeline", "contatos", "financeiro", "mensagens"] } as const;
    if (profile?.crm_access) return { ok: true, userId: user.id, isAdmin: Boolean(profile.crm_is_admin), permissions: Array.isArray(profile.crm_permissions) ? profile.crm_permissions : [] } as const;

    return { ok: false, reason: "email-not-allowed", account: user.email } as const;
  } catch {
    return { ok: false, reason: "auth-unavailable" } as const;
  }
}

