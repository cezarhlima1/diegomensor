import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { crmPool } from "@/lib/crm-db";

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

export async function GET(request: Request) {
  if (!await hasCrmAccess()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const month = new URL(request.url).searchParams.get("month") || "";
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("id, nome, email, crm_commission_rate").eq("crm_access", true).eq("crm_is_closer", true).order("nome");
  if (error) return NextResponse.json({ error: "database-unavailable" }, { status: 503 });
  let goals = new Map<string, number>();
  if (/^\d{4}-\d{2}$/.test(month)) {
    try {
      const result = await crmPool().query("select closer_user_id, amount from public.crm_closer_goals where month=$1", [month]);
      goals = new Map(result.rows.map((row) => [String(row.closer_user_id), Number(row.amount) || 0]));
    } catch (reason) {
      console.error("CRM closer goals GET failed", reason);
    }
  }
  return NextResponse.json({ closers: (data || []).map((profile) => ({ id: profile.id, name: profile.nome || profile.email, email: profile.email, commissionRate: Number(profile.crm_commission_rate) || 0, goal: goals.get(profile.id) || 0 })) });
}

export async function PATCH(request: Request) {
  if (!await hasCrmAccess()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { closerId?: string; month?: string; amount?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  const amount = Number(body.amount);
  if (!body.closerId || !/^\d{4}-\d{2}$/.test(body.month || "") || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  try {
    await crmPool().query("insert into public.crm_closer_goals(closer_user_id,month,amount,updated_at) values($1,$2,$3,now()) on conflict(closer_user_id,month) do update set amount=excluded.amount,updated_at=now()", [body.closerId, body.month, amount]);
    return NextResponse.json({ ok: true });
  } catch (reason) {
    console.error("CRM closer goal PATCH failed", reason);
    return NextResponse.json({ error: "database-write-failed" }, { status: 503 });
  }
}
