import 'server-only';
import type { PoolClient } from 'pg';
import { crmPool } from './crm-db';
import { commissionForSale, commissionPolicyKey, defaultCommissionPolicy, parseCommissionPolicy, type CommissionPolicy } from './crm-commissions';
export async function commissionPolicies() {
  const result = await crmPool().query("select key,value from public.crm_state where key like 'closer_commission_policy:%'");
  return new Map<string, CommissionPolicy>(result.rows.map(row => [String(row.key).slice('closer_commission_policy:'.length), parseCommissionPolicy(JSON.parse(row.value))]));
}
export async function saveCommissionPolicy(closerId: string, policy: CommissionPolicy) {
  await crmPool().query('insert into public.crm_state(key,value) values($1,$2) on conflict(key) do update set value=excluded.value,updated_at=now()', [commissionPolicyKey(closerId), JSON.stringify(policy)]);
}
// Rates are a snapshot per sale. Re-saving installments or a stale CRM snapshot
// must not reprice past sales when the closer's current policy changes.
export async function purchaseCommission(db: PoolClient, purchase: Record<string, unknown>) {
  const fallback = Math.max(0, Math.min(100, Number(purchase.commissionRate) || 0));
  if (!purchase.closerUserId) return 0;
  await db.query('select pg_advisory_xact_lock(hashtext($1))', [`commission:${purchase.closerUserId}`]);
  const existing = await db.query('select closer_user_id,product,closed_at,commission_rate from public.crm_purchases where id=$1', [purchase.id]);
  const previous = existing.rows[0];
  if (previous && String(previous.closer_user_id) === purchase.closerUserId && previous.product === purchase.product && new Date(previous.closed_at).getTime() === new Date(String(purchase.closedAt)).getTime()) return Number(previous.commission_rate);
  const config = await db.query('select value from public.crm_state where key=$1', [commissionPolicyKey(String(purchase.closerUserId))]);
  const policy = config.rows[0] ? parseCommissionPolicy(JSON.parse(config.rows[0].value)) : defaultCommissionPolicy();
  if (policy.mode === 'fixed') return fallback;
  const count = await db.query(`select count(*)::int as total from public.crm_purchases where closer_user_id=$1 and id<>$2 and product=any($3::text[]) and ($4::text='lifetime' or to_char(closed_at at time zone 'America/Sao_Paulo','YYYY-MM')=to_char($5::timestamptz at time zone 'America/Sao_Paulo','YYYY-MM'))`, [purchase.closerUserId, purchase.id, policy.mentorshipProducts, policy.period, purchase.closedAt]);
  return commissionForSale(policy, String(purchase.product), Number(count.rows[0]?.total) || 0, fallback);
}
