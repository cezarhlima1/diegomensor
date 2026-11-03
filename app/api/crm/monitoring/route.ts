import { NextResponse } from 'next/server';
import { authorized } from '@/lib/crm-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { crmPool } from '@/lib/crm-db';
import { closerSelection, monitoringRange } from '@/lib/crm-monitoring';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const auth = await authorized();
  if (!auth.ok) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: 'Acesso exclusivo de administradores do CRM.' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const range = monitoringRange(params.get('period') || 'day', params.get('date') || '');
  if (!range) return NextResponse.json({ error: 'Período inválido.' }, { status: 400 });
  try {
    const db = crmPool();
    const closers = await createSupabaseAdminClient().from("profiles").select("id,nome,email").eq("crm_access", true).eq("crm_is_closer", true).order("nome");
    if (closers.error) throw new Error('Não foi possível consultar o cadastro de closers.');
    const registeredClosers = (closers.data || []).map(closer => ({ id: closer.id, name: closer.nome?.trim() || closer.email }));
    const selectedCloserId = closerSelection(registeredClosers, params.get('closerId') || '');
    if (!selectedCloserId) return NextResponse.json({ range, closers: [], selectedCloserId: '', events: [], sales: [] }, { headers: { 'Cache-Control': 'no-store' } });
    const [events, sales] = await Promise.all([
      db.query(`select l.id as "leadId", l.name as "leadName", e.event from public.crm_leads l cross join lateral jsonb_array_elements(l.journey_history) e(event)
        where e.event->>'kind'='activity' and e.event->>'actorId'=$3 and ((e.event->>'at')::timestamptz at time zone 'America/Sao_Paulo')::date between $1::date and $2::date order by e.event->>'at' desc`, [range.start, range.end, selectedCloserId]),
      db.query(`select p.id, p.lead_id as "leadId", l.name as "leadName", p.closer_user_id as "actorId", p.closer_name as "closerName", p.gross_value as gross, p.net_value as net,
        coalesce((select sum(r.amount) from public.crm_receivables r where r.purchase_id=p.id and r.status='Recebido'),0) as received
        from public.crm_purchases p left join public.crm_leads l on l.id=p.lead_id where p.closer_user_id::text=$3 and (p.closed_at at time zone 'America/Sao_Paulo')::date between $1::date and $2::date`, [range.start, range.end, selectedCloserId]),
    ]);
    return NextResponse.json({ range, closers: registeredClosers, selectedCloserId, events: events.rows, sales: sales.rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('CRM monitoring failed', error);
    return NextResponse.json({ error: 'Não foi possível carregar o monitoramento.' }, { status: 503 });
  }
}
