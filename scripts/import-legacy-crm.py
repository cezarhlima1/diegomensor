import csv, os, re, sys, uuid
from datetime import datetime, timezone

sys.path.insert(0, "/private/tmp/mensor-crm-import-deps")
import psycopg2

SOURCE = "/Users/susanesantos/.codex/attachments/101a1206-6a48-44f7-942b-1c72e0cbe439/pasted-text.txt"
APPLY = "--apply" in sys.argv

def env_value(name):
    with open(".env.local", encoding="utf-8") as handle:
        for line in handle:
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"\'')
    raise RuntimeError(f"{name} não configurada")

def date_value(text):
    text = (text or "").strip()
    if not text or text == "-": return None
    return datetime.strptime(text, "%d/%m/%Y").replace(hour=12, tzinfo=timezone.utc)

def phone_value(text):
    digits = re.sub(r"\D", "", text or "")
    return digits if len(digits) >= 8 else ""

def money_value(text):
    clean = re.sub(r"[^0-9,]", "", text or "").replace(",", ".")
    return float(clean) if clean else 0

def mapped_stage(status):
    if status == "Fechamento": return "Fechado"
    if status == "Proposta enviada": return "Proposta"
    if status in {"Reunião agendada", "Noshow", "Visita na oficina"}: return "Reunião agendada"
    if status in {"Qualificando", "Houve conversa", "Respondeu uma vez", "Retomando contato", "Quer treinamento"} or status.startswith("Follow up"): return "Em conversação"
    return "Primeiro contato"

def mapped_product(product):
    return "Calculadora de precificação" if product.strip() == "Calculadora" else product.strip()

rows = []
with open(SOURCE, encoding="utf-8-sig", newline="") as handle:
    content = handle.readlines()
    header_index = next(index for index, line in enumerate(content) if line.startswith("DATA ABERTURA\t"))
    reader = csv.DictReader(content[header_index:], delimiter="\t")
    for raw in reader:
        name = (raw.get("NOME") or "").strip()
        if not name: continue
        status = (raw.get("STATUS") or "").strip()
        opened = date_value(raw.get("DATA ABERTURA"))
        last = date_value(raw.get("ULTIMO CONTATO"))
        product = mapped_product(raw.get("PRODUTO") or "")
        value = money_value(raw.get("VALOR"))
        if not value and product == "Treinamento Presencial": value = 1000
        notes = (raw.get("OBS") or "").strip()
        if last: notes = "\n".join(filter(None, [notes, f"Último contato na planilha anterior: {last.strftime('%d/%m/%Y')}"]))
        tags = []
        followup = (raw.get("Followup") or "").strip()
        if followup and followup != "-": tags.append(followup)
        if status in {"Lead desqualificado", "Não tem interesse"}: tags.append("Desqualificado")
        rows.append(dict(name=name, phone=phone_value(raw.get("WHATSAPP")), source="Formulário", product=product, value=value, status=status, stage=mapped_stage(status), opened=opened, last=last, closed=(last or opened) if status == "Fechamento" else None, notes=notes, tags=tags))

# A linha "Esposa Evandro" representa a segunda parte do mesmo fechamento.
evandro_extra = sum(item["value"] for item in rows if item["name"].lower() == "esposa evandro")
rows = [item for item in rows if item["name"].lower() != "esposa evandro"]
for item in rows:
    if item["name"].lower() == "evandro filipe duarte" and item["status"] == "Fechamento":
        item["value"] += evandro_extra
        item["notes"] = "\n".join(filter(None, [item["notes"], "Valor consolidado do casal na planilha anterior."]))

connection = psycopg2.connect(env_value("CRM_DATABASE_URL"), sslmode="require")
connection.autocommit = False
cur = connection.cursor()
cur.execute("select id,name,phone,email,notes,tags,stage,created_at from public.crm_leads")
existing = cur.fetchall()
by_phone = {phone_value(row[2]): row for row in existing if phone_value(row[2])}
by_name = {row[1].strip().lower(): row for row in existing}
cur.execute("select name,gross_price,net_price from public.crm_products")
catalog = {row[0]: (float(row[1]), float(row[2])) for row in cur.fetchall()}

created = updated = purchases_added = purchases_skipped = 0
seen_leads = {}
for item in rows:
    match = by_phone.get(item["phone"]) or (by_name.get(item["name"].lower()) if not item["phone"] else None)
    lead_id = match[0] if match else seen_leads.get(item["phone"] or item["name"].lower())
    if not lead_id:
        lead_id = f"legacy-{uuid.uuid4()}"
        created += 1
        if APPLY:
            cur.execute("insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,net_value,temperature,next_action,display_date,created_at,conversation_at,meeting_at,proposal_at,closed_at,updated_at) values(%s,%s,'',%s,'',%s,%s,%s,%s,%s,%s,%s,'Morno','',%s,%s,%s,%s,%s,%s,now())", (lead_id,item["name"],item["phone"],item["notes"],item["tags"],item["source"],item["product"] or None,item["stage"],item["value"],item["value"],item["opened"].strftime("%d/%m/%Y") if item["opened"] else "",item["opened"],item["last"] if item["stage"] != "Primeiro contato" else None,item["last"] if item["stage"] == "Reunião agendada" else None,item["last"] if item["stage"] == "Proposta" else None,item["closed"]))
        seen_leads[item["phone"] or item["name"].lower()] = lead_id
    else:
        updated += 1
        if APPLY:
            old_notes = match[4] if match else ""
            old_tags = list(match[5] or []) if match else []
            notes = old_notes if item["notes"] and item["notes"] in old_notes else "\n".join(filter(None, [old_notes, item["notes"]]))
            tags = list(dict.fromkeys(old_tags + item["tags"]))
            cur.execute("update public.crm_leads set name=%s,phone=case when phone='' then %s else phone end,notes=%s,tags=%s,source=%s,product=coalesce(%s,product),stage=%s,gross_value=case when %s>0 then %s else gross_value end,net_value=case when %s>0 then %s else net_value end,created_at=coalesce(created_at,%s),conversation_at=coalesce(conversation_at,%s),meeting_at=coalesce(meeting_at,%s),proposal_at=coalesce(proposal_at,%s),closed_at=coalesce(%s,closed_at),updated_at=now() where id=%s", (item["name"],item["phone"],notes,tags,item["source"],item["product"] or None,item["stage"],item["value"],item["value"],item["value"],item["value"],item["opened"],item["last"] if item["stage"] != "Primeiro contato" else None,item["last"] if item["stage"] == "Reunião agendada" else None,item["last"] if item["stage"] == "Proposta" else None,item["closed"],lead_id))
    if item["status"] == "Fechamento" and item["closed"]:
        purchase_id = f"legacy-sheet-{lead_id}-{item['product']}-{item['closed'].date()}-{item['value']}"
        cur.execute("select 1 from public.crm_purchases where id=%s or (lead_id=%s and product=%s and closed_at::date=%s and gross_value=%s)", (purchase_id,lead_id,item["product"],item["closed"].date(),item["value"]))
        if cur.fetchone(): purchases_skipped += 1
        else:
            purchases_added += 1
            if APPLY: cur.execute("insert into public.crm_purchases(id,lead_id,product,gross_value,net_value,closed_at,is_repurchase) values(%s,%s,%s,%s,%s,%s,%s)", (purchase_id,lead_id,item["product"],item["value"],item["value"],item["closed"],False))

if APPLY:
    cur.execute("insert into public.crm_products(name,gross_price,net_price,active,updated_at) values('Treinamento Presencial',1000,1000,true,now()) on conflict(name) do update set gross_price=1000,net_price=1000,active=true,updated_at=now()")
    connection.commit()
else: connection.rollback()
print(f"modo={'GRAVAÇÃO' if APPLY else 'SIMULAÇÃO'} linhas={len(rows)} novos={created} existentes_atualizados={updated} compras_novas={purchases_added} compras_ja_existentes={purchases_skipped}")
