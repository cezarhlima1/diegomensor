import { NextResponse } from "next/server";
import { crmPool, withCrmTransaction } from "@/lib/crm-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const allowed = `${process.env.CRM_ALLOWED_EMAIL || ""},susanesamt@gmail.com`.replace(/["']/g, "").split(",").map((item) => item.trim().toLowerCase());
  if (allowed.includes(user.email.toLowerCase())) return true;
  const { data } = await supabase.from("profiles").select("is_super_admin,crm_access,crm_is_admin,crm_permissions").eq("id",user.id).maybeSingle();
  return Boolean(data?.is_super_admin || (data?.crm_access && (data.crm_is_admin || data.crm_permissions?.includes("campanhas"))));
}
const failed = (error: unknown) => NextResponse.json({ error:"database-write-failed", detail:error instanceof Error ? error.message : "" },{status:503});

export async function GET() {
  if (!await authorized()) return NextResponse.json({error:"permission-denied"},{status:403});
  try {
    const db=crmPool();
    const [actions,participants]=await Promise.all([db.query("select * from public.crm_commercial_actions order by starts_on"),db.query("select * from public.crm_action_participants order by created_at")]);
    return NextResponse.json({actions:actions.rows.map((r)=>({id:r.id,name:r.name,startsOn:r.starts_on,endsOn:r.ends_on,description:r.description,offeredProduct:r.offered_product,accessType:r.access_type,ticketValue:Number(r.ticket_value),status:r.status})),participants:participants.rows.map((r)=>({id:r.id,actionId:r.action_id,leadId:r.lead_id,name:r.name,phone:r.phone,email:r.email,source:r.source,participationStatus:r.participation_status||"Inscrito",ticketType:r.ticket_type,ticketAmount:Number(r.ticket_amount),paymentStatus:r.payment_status,paymentDate:r.payment_date,boughtProduct:r.bought_product,saleAmount:Number(r.sale_amount),saleDate:r.sale_date,crmStatus:r.crm_status}))});
  } catch(error){return failed(error);}
}

export async function POST(request:Request) {
  if (!await authorized()) return NextResponse.json({error:"permission-denied"},{status:403});
  const body=await request.json().catch(()=>null); if(!body) return NextResponse.json({error:"invalid-payload"},{status:400});
  try {
    const db=crmPool();
    if(body.entity==="action") {
      const a=body.record;if(!a?.id||!a?.name||!a?.startsOn)return NextResponse.json({error:"invalid-payload"},{status:400});
      await db.query("insert into public.crm_commercial_actions(id,name,starts_on,ends_on,description,offered_product,access_type,ticket_value,status,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,now()) on conflict(id) do update set name=excluded.name,starts_on=excluded.starts_on,ends_on=excluded.ends_on,description=excluded.description,offered_product=excluded.offered_product,access_type=excluded.access_type,ticket_value=excluded.ticket_value,status=excluded.status,updated_at=now()",[a.id,a.name,a.startsOn,a.endsOn||null,a.description||"",a.offeredProduct||null,a.accessType||"Gratuita",Number(a.ticketValue)||0,a.status||"Planejada"]);return NextResponse.json({ok:true});
    }
    if(body.entity==="participant") {
      const p=body.record;if(!p?.id||!p?.actionId||!p?.name)return NextResponse.json({error:"invalid-payload"},{status:400});
      await db.query("insert into public.crm_action_participants(id,action_id,name,phone,email,source,participation_status,ticket_type,ticket_amount,payment_status,payment_date,bought_product,sale_amount,sale_date,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now()) on conflict(id) do update set name=excluded.name,phone=excluded.phone,email=excluded.email,source=excluded.source,participation_status=excluded.participation_status,ticket_type=excluded.ticket_type,ticket_amount=excluded.ticket_amount,payment_status=excluded.payment_status,payment_date=excluded.payment_date,bought_product=excluded.bought_product,sale_amount=excluded.sale_amount,sale_date=excluded.sale_date,updated_at=now()",[p.id,p.actionId,p.name,p.phone||"",String(p.email||"").toLowerCase(),p.source||"",p.participationStatus||"Inscrito",p.ticketType||"Gratuito",Number(p.ticketAmount)||0,p.paymentStatus||"Pendente",p.paymentDate||null,p.boughtProduct||null,Number(p.saleAmount)||0,p.saleDate||null]);return NextResponse.json({ok:true});
    }
    if(body.entity==="release"&&body.actionId) {
      const released=await withCrmTransaction(async(db)=>{const action=(await db.query("select * from public.crm_commercial_actions where id=$1",[body.actionId])).rows[0];const rows=(await db.query("select * from public.crm_action_participants where action_id=$1 and crm_status='Aguardando liberação'",[body.actionId])).rows;let count=0;for(const p of rows){const matches=(await db.query("select * from public.crm_leads where ($1<>'' and lower(email)=lower($1)) or ($2<>'' and regexp_replace(phone,'\\D','','g')=regexp_replace($2,'\\D','','g'))",[p.email,p.phone])).rows;if(matches.length>1){await db.query("update public.crm_action_participants set crm_status='Conflito',updated_at=now() where id=$1",[p.id]);continue;}let lead=matches[0];const id=lead?.id||`action-${p.id}`;const tag=`Ação: ${action.name}`;if(lead)await db.query("update public.crm_leads set tags=case when $2=any(coalesce(tags,'{}')) then tags else array_append(coalesce(tags,'{}'),$2) end,stage=case when $3 then stage else 'Novo lead' end,updated_at=now() where id=$1",[id,tag,Boolean(p.bought_product)]);else await db.query("insert into public.crm_leads(id,name,company,phone,email,tags,source,product,stage,gross_value,temperature,next_action,display_date,created_at,updated_at) values($1,$2,'',$3,$4,array[$5],$6,$7,$8,$9,'Morno','',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),now(),now())",[id,p.name,p.phone,p.email,tag,p.source||'Cadastro',p.bought_product||action.offered_product,p.bought_product?'Fechado':'Novo lead',Number(p.sale_amount)||0]);if(p.bought_product&&Number(p.sale_amount)>0)await db.query("insert into public.crm_purchases(id,lead_id,product,gross_value,net_value,closed_at,is_repurchase,purchase_origin) values($1,$2,$3,$4,$4,$5,false,'pipeline') on conflict(id) do nothing",[`action-sale-${p.id}`,id,p.bought_product,Number(p.sale_amount),p.sale_date||new Date()]);await db.query("update public.crm_action_participants set lead_id=$2,crm_status='Liberado para o CRM',released_at=now(),updated_at=now() where id=$1",[p.id,id]);count++;}return count;});return NextResponse.json({ok:true,released});
    }
    return NextResponse.json({error:"invalid-payload"},{status:400});
  }catch(error){return failed(error);}
}
