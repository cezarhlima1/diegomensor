import 'server-only';
import type { PoolClient } from 'pg';
export const retiredReviewStage = 'Revisar entrada';
export const deletedStageKey = (stage: string) => `deleted_pipeline_stage:${stage}`;
export async function addPipelineStage(db: PoolClient, name: string) {
  if (!name.trim() || name === retiredReviewStage || name.length > 100) throw Error('invalid-stage');
  await db.query("select pg_advisory_xact_lock(hashtext('crm-pipeline-stages'))");
  await db.query('delete from public.crm_state where key=$1', [deletedStageKey(name)]);
  await db.query('insert into public.crm_pipeline_stages(name,position) select $1,coalesce(max(position),-1)+1 from public.crm_pipeline_stages where true on conflict(name) do nothing', [name]);
  return (await db.query('select name from public.crm_pipeline_stages order by position')).rows.map(row => row.name as string);
}
export async function removePipelineStage(db: PoolClient, name: string) {
  if (name === 'Novo lead') throw Error('protected-stage');
  await db.query("select pg_advisory_xact_lock(hashtext('crm-pipeline-stages'))");
  const stages = (await db.query('select name from public.crm_pipeline_stages order by position for update')).rows.map(row => String(row.name));
  const remaining = stages.filter(stage => stage !== name);
  if (!remaining.length) throw Error('last-stage');
  // Count all leads, including archived contacts and contacts hidden by filters.
  // Keep concurrent lead writes out until the empty-stage deletion commits.
  await db.query('lock table public.crm_leads in share row exclusive mode');
  const occupied = await db.query('select 1 from public.crm_leads where stage=$1 limit 1', [name]);
  if (occupied.rows.length) throw Error('stage-not-empty');
  await db.query("insert into public.crm_state(key,value) values($1,'true') on conflict(key) do update set value='true',updated_at=now()", [deletedStageKey(name)]);
  await db.query('delete from public.crm_pipeline_stages where name=$1', [name]);
  return { stages: remaining };
}
