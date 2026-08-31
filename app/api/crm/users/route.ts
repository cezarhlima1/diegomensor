import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRM_TABS = ["geral", "comercial", "trafego", "campanhas", "pipeline", "contatos", "financeiro", "mensagens"] as const;
type CrmTab = typeof CRM_TABS[number];

function allowedEmails() {
  return `${process.env.CRM_ALLOWED_EMAIL || ""},susanesamt@gmail.com`.replace(/["']/g, "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

async function requireCrmAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  if (allowedEmails().includes(user.email.trim().toLowerCase())) return user;
  const { data: profile } = await supabase.from("profiles").select("is_super_admin, crm_access, crm_is_admin").eq("id", user.id).maybeSingle();
  return profile?.is_super_admin || (profile?.crm_access && profile?.crm_is_admin) ? user : null;
}

function validPermissions(value: unknown): CrmTab[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is CrmTab => CRM_TABS.includes(item as CrmTab)))];
}

export async function GET() {
  if (!await requireCrmAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createSupabaseAdminClient();
  const full = await admin.from("profiles").select("id, nome, email, crm_access, crm_is_admin, crm_permissions, crm_is_closer, crm_commission_rate, created_at").eq("crm_access", true).order("created_at");
  if (!full.error) return NextResponse.json({ users: (full.data || []).map((profile) => ({ id: profile.id, name: profile.nome || "", email: profile.email, isAdmin: profile.crm_is_admin, permissions: profile.crm_permissions || [], isCloser: profile.crm_is_closer, commissionRate: Number(profile.crm_commission_rate) || 0 })) });
  // Compatibilidade durante o intervalo entre o deploy da aplicação e a
  // migração 0027, que adiciona os campos de closer aos perfis.
  const legacy = await admin.from("profiles").select("id, nome, email, crm_access, crm_is_admin, crm_permissions, created_at").eq("crm_access", true).order("created_at");
  if (legacy.error) return NextResponse.json({ error: "database-unavailable", detail: legacy.error.message }, { status: 503 });
  return NextResponse.json({ users: (legacy.data || []).map((profile) => ({ id: profile.id, name: profile.nome || "", email: profile.email, isAdmin: profile.crm_is_admin, permissions: profile.crm_permissions || [], isCloser: false, commissionRate: 0 })) });
}

export async function POST(request: Request) {
  const caller = await requireCrmAdmin();
  if (!caller) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { name?: string; email?: string; password?: string; permissions?: unknown; isAdmin?: boolean; isCloser?: boolean; commissionRate?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const permissions = validPermissions(body.permissions);
  const commissionRate = Number(body.commissionRate) || 0;
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || (!body.isAdmin && !permissions.length) || commissionRate < 0 || commissionRate > 100) return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nome: name } });
  if (createError || !created.user) return NextResponse.json({ error: createError?.message || "user-create-failed" }, { status: 409 });
  const effectivePermissions = body.isAdmin ? [...CRM_TABS] : permissions;
  const profileValues = { nome: name, email, crm_access: true, crm_is_admin: Boolean(body.isAdmin), crm_permissions: effectivePermissions };
  const fullProfile = await admin.from("profiles").update({ ...profileValues, crm_is_closer: Boolean(body.isCloser), crm_commission_rate: body.isCloser ? commissionRate : 0 }).eq("id", created.user.id);
  const profileError = fullProfile.error ? (await admin.from("profiles").update(profileValues).eq("id", created.user.id)).error : null;
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "profile-update-failed" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, user: { id: created.user.id, name, email, isAdmin: Boolean(body.isAdmin), permissions: effectivePermissions, isCloser: Boolean(body.isCloser), commissionRate: body.isCloser ? commissionRate : 0 } }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await requireCrmAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { id?: string; name?: string; email?: string; password?: string; permissions?: unknown; isAdmin?: boolean; isCloser?: boolean; commissionRate?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  const id = String(body.id || "");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const permissions = validPermissions(body.permissions);
  const commissionRate = Number(body.commissionRate) || 0;
  if (!id || !name || !/^\S+@\S+\.\S+$/.test(email) || (password && password.length < 8) || (!body.isAdmin && !permissions.length) || commissionRate < 0 || commissionRate > 100) return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(id, { email, ...(password ? { password } : {}), user_metadata: { nome: name } });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 409 });
  const effectivePermissions = body.isAdmin ? [...CRM_TABS] : permissions;
  const profileValues = { nome: name, email, crm_access: true, crm_is_admin: Boolean(body.isAdmin), crm_permissions: effectivePermissions };
  const fullProfile = await admin.from("profiles").update({ ...profileValues, crm_is_closer: Boolean(body.isCloser), crm_commission_rate: body.isCloser ? commissionRate : 0 }).eq("id", id);
  const error = fullProfile.error ? (await admin.from("profiles").update(profileValues).eq("id", id)).error : null;
  if (error) return NextResponse.json({ error: "profile-update-failed" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const caller = await requireCrmAdmin();
  if (!caller) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let body: { id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  if (!body.id || body.id === caller.id) return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(body.id);
  if (error) return NextResponse.json({ error: "user-delete-failed" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
