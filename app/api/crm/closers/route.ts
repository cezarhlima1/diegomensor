import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function hasCrmAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const principal = user.email.trim().toLowerCase() === "susanesamt@gmail.com";
  const configured = (process.env.CRM_ALLOWED_EMAIL || "").replace(/["']/g, "").split(",").map((email) => email.trim().toLowerCase()).includes(user.email.trim().toLowerCase());
  if (principal || configured) return true;
  const { data: profile } = await supabase.from("profiles").select("is_super_admin, crm_access").eq("id", user.id).maybeSingle();
  return Boolean(profile?.is_super_admin || profile?.crm_access);
}

export async function GET() {
  if (!await hasCrmAccess()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("id, nome, email, crm_commission_rate").eq("crm_access", true).eq("crm_is_closer", true).order("nome");
  if (error) return NextResponse.json({ error: "database-unavailable" }, { status: 503 });
  return NextResponse.json({ closers: (data || []).map((profile) => ({ id: profile.id, name: profile.nome || profile.email, email: profile.email, commissionRate: Number(profile.crm_commission_rate) || 0 })) });
}

