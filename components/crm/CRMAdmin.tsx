"use client";

import { useEffect, useState } from "react";
import { defaultCommissionPolicy, type CommissionPolicy } from "@/lib/crm-commissions";
import styles from "./crm.module.css";

export const CRM_MODULES = [
  ["geral", "Visão geral"], ["comercial", "Orgânico"], ["trafego", "Tráfego"],
  ["campanhas", "Campanhas"], ["pipeline", "Pipeline"], ["contatos", "Leads"],
  ["financeiro", "Financeiro"], ["mensagens", "Detalhes"],
] as const;
export type CrmModule = typeof CRM_MODULES[number][0];
type CrmUser = { id: string; name: string; email: string; isAdmin: boolean; permissions: CrmModule[]; isCloser: boolean; commissionRate: number; commissionPolicy?: CommissionPolicy };

const allModules = CRM_MODULES.map(([id]) => id);

export default function CRMAdmin({ products = [] }: { products?: { name: string }[] }) {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<CrmModule[]>(["geral"]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCloser, setIsCloser] = useState(false);
  const [commissionRate, setCommissionRate] = useState(0);
  const [commissionPolicy, setCommissionPolicy] = useState<CommissionPolicy>(defaultCommissionPolicy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/crm/users", { cache: "no-store" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      if (response.status === 403) throw new Error("Sua sessão não possui permissão administrativa. Atualize a página e entre novamente.");
      throw new Error(result.error === "database-unavailable" ? `Não foi possível consultar os acessos: ${result.detail || "erro de banco de dados"}.` : `Não foi possível carregar os acessos (erro ${response.status}).`);
    }
    const data = await response.json();
    setUsers(data.users || []);
  };
  useEffect(() => { void load().catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, []);

  const toggle = (module: CrmModule) => setPermissions((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/crm/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, permissions, isAdmin, isCloser, commissionRate, commissionPolicy }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === "commission-policy-save-failed" ? "Não foi possível salvar a regra de comissão. O acesso não foi criado." : result.error?.includes("already") ? "Este e-mail já possui cadastro." : "Não foi possível criar o acesso. Revise os dados.");
      setUsers((current) => [...current, result.user]);
      window.dispatchEvent(new Event("mensor-crm-closers-updated"));
      setName(""); setEmail(""); setPassword(""); setPermissions(["geral"]); setIsAdmin(false); setIsCloser(false); setCommissionRate(0); setCommissionPolicy(defaultCommissionPolicy());
      setMessage(`Acesso de ${result.user.name} criado com sucesso.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível criar o acesso."); }
    finally { setSaving(false); }
  };
  const update = async (user: CrmUser) => {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/crm/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(user) });
      if (!response.ok) throw new Error("Não foi possível salvar o acesso e a regra de comissão. Tente novamente.");
      window.dispatchEvent(new Event("mensor-crm-closers-updated"));
      setMessage(`Acesso e comissão de ${user.name} atualizados.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  };
  const remove = async (user: CrmUser) => {
    if (!window.confirm(`Excluir o acesso de ${user.name}?`)) return;
    const response = await fetch("/api/crm/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id }) });
    if (!response.ok) { setError("Não foi possível excluir o acesso."); return; }
    setUsers((current) => current.filter((item) => item.id !== user.id));
  };
  const patchUser = (id: string, patch: Partial<CrmUser>) => setUsers((current) => current.map((user) => user.id === id ? { ...user, ...patch } : user));
  const toggleUserModule = (user: CrmUser, module: CrmModule) => patchUser(user.id, { permissions: user.permissions.includes(module) ? user.permissions.filter((item) => item !== module) : [...user.permissions, module] });

  return <div className={`${styles.content} ${styles.crmAdmin}`}>
    <section className={styles.adminCreate}>
      <header><span>ADMINISTRAÇÃO</span><h2>Criar acesso ao CRM</h2><p>Cadastre a pessoa e escolha exatamente quais áreas ela poderá acessar.</p></header>
      <form onSubmit={create}>
        <label><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label><span>E-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label><span>Senha inicial</span><input type="text" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" required /></label>
        <label className={styles.adminSwitch}><input type="checkbox" checked={isAdmin} onChange={(event) => { setIsAdmin(event.target.checked); if (event.target.checked) setPermissions([...allModules]); }} /><span>Acesso administrador (todas as abas + ADM)</span></label>
        <div className={styles.closerConfig}><label className={styles.adminSwitch}><input type="checkbox" checked={isCloser} onChange={(event) => setIsCloser(event.target.checked)} /><span>Esta pessoa atua como closer</span></label>{isCloser && <CommissionFields products={products} policy={commissionPolicy} rate={commissionRate} setPolicy={setCommissionPolicy} setRate={setCommissionRate} />}</div>
        <fieldset disabled={isAdmin}><legend>Abas permitidas</legend><div className={styles.permissionGrid}>{CRM_MODULES.map(([id, label]) => <label key={id}><input type="checkbox" checked={permissions.includes(id)} onChange={() => toggle(id)} /><span>{label}</span></label>)}</div></fieldset>
        {error && <p className={styles.adminError}>{error}</p>}{message && <p className={styles.adminSuccess}>{message}</p>}
        <button disabled={saving || (!isAdmin && !permissions.length)}>{saving ? "Salvando…" : "Criar acesso"}</button>
      </form>
    </section>
    <section className={styles.adminUsers}>
      <header><div><span>USUÁRIOS</span><h2>Acessos cadastrados</h2></div><b>{users.length}</b></header>
      {loading ? <p>Carregando acessos…</p> : users.length === 0 ? <p>Nenhum acesso adicional cadastrado.</p> : <div>{users.map((user) => <article key={user.id}>
        <header><div><b>{user.name}</b><small>{user.email}</small></div><label className={styles.adminSwitch}><input type="checkbox" checked={user.isAdmin} onChange={(event) => patchUser(user.id, { isAdmin: event.target.checked, permissions: event.target.checked ? [...allModules] : user.permissions })} /><span>Administrador</span></label></header>
        <div className={styles.closerConfig}><label className={styles.adminSwitch}><input type="checkbox" checked={user.isCloser} onChange={(event) => patchUser(user.id, { isCloser: event.target.checked, commissionRate: event.target.checked ? user.commissionRate : 0 })} /><span>Closer</span></label>{user.isCloser && <CommissionFields products={products} policy={user.commissionPolicy || defaultCommissionPolicy()} rate={user.commissionRate} setPolicy={(policy) => patchUser(user.id, { commissionPolicy: policy })} setRate={(rate) => patchUser(user.id, { commissionRate: rate })} />}</div>
        <div className={styles.permissionGrid}>{CRM_MODULES.map(([id, label]) => <label key={id}><input type="checkbox" disabled={user.isAdmin} checked={user.isAdmin || user.permissions.includes(id)} onChange={() => toggleUserModule(user, id)} /><span>{label}</span></label>)}</div>
        <footer><button disabled={saving || (!user.isAdmin && !user.permissions.length)} onClick={() => void update(user)}>Salvar acesso e comissão</button><button onClick={() => void remove(user)}>Excluir acesso</button></footer>
      </article>)}</div>}
    </section>
  </div>;
}

function CommissionFields({ products, policy, rate, setPolicy, setRate }: {
  products: { name: string }[]; policy: CommissionPolicy; rate: number;
  setPolicy: (policy: CommissionPolicy) => void; setRate: (rate: number) => void;
}) {
  return <div className={styles.commissionRule}>
    <label><span>Modelo de comissão</span><select value={policy.mode} onChange={event => setPolicy({ ...policy, mode: event.target.value as CommissionPolicy['mode'], mentorshipProducts: policy.mentorshipProducts.length ? policy.mentorshipProducts : products.filter(product => /mentoria/i.test(product.name)).map(product => product.name) })}><option value="fixed">Percentual fixo</option><option value="progressive">Mentoria progressiva + demais vendas</option></select></label>
    {policy.mode === 'fixed' ? <label><span>Comissão sobre o valor recebido</span><div><input type="number" min="0" max="100" step="0.01" value={rate} onChange={event => setRate(Number(event.target.value))} required /><b>%</b></div></label> : <>
      <fieldset><legend>Produtos que contam como mentoria</legend><div className={styles.permissionGrid}>{[...new Set([...products.map(product => product.name), ...policy.mentorshipProducts])].map(product => <label key={product}><input type="checkbox" checked={policy.mentorshipProducts.includes(product)} onChange={event => setPolicy({ ...policy, mentorshipProducts: event.target.checked ? [...policy.mentorshipProducts, product] : policy.mentorshipProducts.filter(item => item !== product) })} /><span>{product}</span></label>)}</div></fieldset>
      {!policy.mentorshipProducts.length && <p className={styles.adminError}>Selecione pelo menos um produto de mentoria.</p>}
      <label><span>Contagem das vendas de mentoria</span><select value={policy.period} onChange={event => setPolicy({ ...policy, period: event.target.value as CommissionPolicy['period'] })}><option value="monthly">Reinicia todo mês</option><option value="lifetime">Acumulada desde a primeira venda</option></select></label>
      <div className={styles.commissionTiers}>{[['1ª à 5ª', '5%'], ['6ª', '6%'], ['7ª', '7%'], ['8ª', '8%'], ['9ª', '9%'], ['10ª em diante', '10%']].map(([sale, percent]) => <span key={sale}><small>{sale} venda</small><b>{percent}</b></span>)}</div>
      <label><span>Comissão das demais vendas</span><div><input type="number" min="0" max="100" step="0.01" value={policy.otherRate} onChange={event => setPolicy({ ...policy, otherRate: Number(event.target.value) })} required /><b>%</b></div></label>
      <p className={styles.commissionRuleNote}>Cada faixa vale apenas para a respectiva venda. As taxas anteriores ficam preservadas. Contagem por closer e pela ordem de registro dos fechamentos; somente os produtos de mentoria selecionados avançam a faixa. Vendas de mentoria já registradas entram na contagem. A regra vale para novos fechamentos e não recalcula as taxas anteriores. A comissão é paga sobre os valores recebidos.</p>
    </>}
  </div>;
}
