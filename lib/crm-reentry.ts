import type { Pool, PoolClient } from "pg";

// Run only for an incoming contact, never for routine CRM saves or reads.
export async function reactivateDisqualifiedLead(db: Pick<Pool | PoolClient, "query">, id: string) {
  const result = await db.query(`update public.crm_leads set
    stage='Novo lead',
    tags=array['Já desqualificado'] || array(
      select tag from unnest(coalesce(tags,'{}'::text[])) tag
      where lower(trim(tag)) not in ('desqualificado','já desqualificado')),
    created_at=now(),display_date=to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),
    gross_value=0,net_value=null,conversation_at=null,meeting_at=null,
    meeting_scheduled_for=null,meeting_outcome=null,follow_up_at=null,proposal_at=null,closed_at=null,next_action='',
    updated_at=now()
    where id=$1 and (lower(trim(stage))='desqualificado'
      or exists(select 1 from unnest(coalesce(tags,'{}'::text[])) tag where lower(trim(tag))='desqualificado'))
    returning id`, [id]);
  return Boolean(result.rows[0]);
}
