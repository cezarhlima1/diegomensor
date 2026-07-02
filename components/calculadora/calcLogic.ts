/* ============================================================
   Lógica pura da Calculadora de Precificação
   (cálculos, faixas de markup, persistência em localStorage)
   ============================================================ */

/* ---------- Passo #01 — custos fixos operacionais ---------- */
export type CustoField = { key: string; label: string };

export const CUSTO_FIELDS: CustoField[] = [
  { key: "proLabore", label: "Pró-labore" },
  { key: "salarios", label: "Salários" },
  { key: "aluguel", label: "Aluguel" },
  { key: "simples", label: "Simples (média 6 meses)" },
  { key: "taxasCartao", label: "Taxas de cartão (média 6 meses)" },
  { key: "sistemaGestao", label: "Sistema de gestão" },
  { key: "plataformaMaterial", label: "Plataforma de material téc." },
  { key: "agua", label: "Água" },
  { key: "luz", label: "Luz" },
  { key: "internet", label: "Internet / Telefone" },
  { key: "celular", label: "Celular" },
  { key: "marketing", label: "Marketing" },
  { key: "atualizacaoScanner", label: "Atualização scaner" },
  { key: "ferramentasCursos", label: "Ferramentas / Cursos" },
  { key: "materialLimpeza", label: "Material de limpeza" },
  { key: "materialEscritorio", label: "Material de escritório" },
  { key: "medicinaTrabalho", label: "Medicina do trabalho" },
  { key: "manutencaoEquip", label: "Manutenção em equip." },
  { key: "iptuIpva", label: "IPTU / IPVA" },
  { key: "contador", label: "Contador" },
  { key: "valeAlimentacao", label: "Vale alimentação" },
  { key: "coletaInsumos", label: "Empresa de coleta de insumos" },
  { key: "uniformes", label: "Uniformes" },
  { key: "outros", label: "Outros" },
];

/* ---------- Passo #02 — faixas de markup por custo da peça ---------- */
export type MarkupTier = {
  /** rótulo exibido da faixa */
  label: string;
  /** limite superior (inclusivo) da faixa em R$; Infinity para a última */
  max: number;
  /** markup em % aplicado sobre o custo */
  markup: number;
};

export const DEFAULT_MARKUP_TIERS: MarkupTier[] = [
  { label: "R$ 1,00 a R$ 50,00", max: 50, markup: 200 },
  { label: "R$ 51,00 a R$ 100,00", max: 100, markup: 100 },
  { label: "R$ 101,00 a R$ 200,00", max: 200, markup: 80 },
  { label: "R$ 201,00 a R$ 300,00", max: 300, markup: 70 },
  { label: "Acima de R$ 300,00", max: Infinity, markup: 65 },
];

/* ---------- multiplicador do custo da hora ---------- */
export const MULT_MIN = 1;
export const MULT_MAX = 2;
export const MULT_DEFAULT = 2;

/* ---------- ajuste manual do markup da peça ---------- */
export const MARKUP_MIN = 65;
export const MARKUP_MAX = 300;

/* ---------- parsing / formatação (pt-BR) ---------- */

/** Converte texto no formato BR (ex.: "1.500,50" ou "2.100") em número. */
export function parseNum(v: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.]/g, "");
  // vírgula presente → decimal BR; ponto sempre é separador de milhar
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\./g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export const brl = (n: number): string =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Máscara de digitação: agrupa milhares e mantém a vírgula decimal (até 2 casas). */
export function maskMoneyTyping(v: string): string {
  let s = v.replace(/[^\d,]/g, "");
  const firstComma = s.indexOf(",");
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
  }
  const [rawInt, rawDec] = s.split(",");
  const intPart = (rawInt ?? "").replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (rawDec !== undefined) return `${grouped || "0"},${rawDec.slice(0, 2)}`;
  return grouped;
}

/** Ao sair do campo: completa para 2 casas decimais (ex.: "2.100" → "2.100,00"). */
export function formatMoneyBlur(v: string): string {
  if (!v.trim()) return "";
  const n = parseNum(v);
  if (n === 0 && !/\d/.test(v)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Máscara de inteiro simples com separador de milhar (horas, mecânicos). */
export function maskIntTyping(v: string): string {
  const digits = v.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* ---------- Passo #01 — custo da hora ---------- */
export type CustoHoraResult = {
  totalCustos: number;
  horasEfetivas: number;
  custoBase: number;
  custoFinal: number;
};

export function somaCustos(custos: Record<string, string>): number {
  return CUSTO_FIELDS.reduce((acc, f) => acc + parseNum(custos[f.key] ?? ""), 0);
}

export function calcCustoHora(
  totalCustos: number,
  horasMes: number,
  mecanicos: number,
  multiplicador: number,
): CustoHoraResult {
  // horas disponíveis somadas entre os mecânicos → mais mecânicos, menor custo/hora
  const horasEfetivas = horasMes * mecanicos;
  const custoBase = horasEfetivas > 0 ? totalCustos / horasEfetivas : 0;
  const custoFinal = custoBase * multiplicador;
  return { totalCustos, horasEfetivas, custoBase, custoFinal };
}

/* ---------- Passo #02 — valor da peça ---------- */
export type Peca = {
  id: string;
  nome: string;
  custo: string;
  /** markup manual (%); null = usa a sugestão da faixa */
  markup: number | null;
  /** quantidade de peças (multiplica o valor final) */
  quantidade: string;
  /** horas de serviço da peça (define a mão de obra individual) */
  horas: string;
};

export function novaPeca(): Peca {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    nome: "",
    custo: "",
    markup: null,
    quantidade: "1",
    horas: "",
  };
}

/** quantidade da peça (mínimo 1). */
export function quantidadePeca(peca: Peca): number {
  const q = parseNum(peca.quantidade);
  return q > 0 ? q : 1;
}

export function tierForCost(cost: number, tiers: MarkupTier[]): MarkupTier {
  return tiers.find((t) => cost <= t.max) ?? tiers[tiers.length - 1];
}

/** markup efetivo da peça: manual se definido, senão a sugestão da faixa. */
export function markupDaPeca(peca: Peca, tiers: MarkupTier[]): number {
  if (peca.markup != null) return peca.markup;
  return tierForCost(parseNum(peca.custo), tiers).markup;
}

/** preço final de uma peça (custo + markup efetivo × quantidade). */
export function precoPecaItem(peca: Peca, tiers: MarkupTier[]): number {
  const cost = parseNum(peca.custo);
  if (cost <= 0) return 0;
  return cost * (1 + markupDaPeca(peca, tiers) / 100) * quantidadePeca(peca);
}

/** soma dos preços finais de todas as peças. */
export function somaPecas(pecas: Peca[], tiers: MarkupTier[]): number {
  return pecas.reduce((acc, p) => acc + precoPecaItem(p, tiers), 0);
}

/** mão de obra de uma peça: valor da hora × horas de serviço. */
export function maoDeObraPeca(peca: Peca, valorHora: number): number {
  return valorHora * parseNum(peca.horas);
}

/** soma da mão de obra de todas as peças. */
export function somaMaoDeObra(pecas: Peca[], valorHora: number): number {
  return pecas.reduce((acc, p) => acc + maoDeObraPeca(p, valorHora), 0);
}

/* ---------- Histórico de orçamentos (localStorage) ---------- */
export type PecaResumo = {
  nome: string;
  valor: number;
  quantidade?: number;
  maoDeObra?: number;
};

export type Orcamento = {
  id: string;
  nomeCliente: string;
  nomeCarro: string;
  valorHora: number;
  horas: number;
  maoDeObra: number;
  pecas: PecaResumo[];
  valorPeca: number;
  total: number;
  data: string; // ISO
};

const STORAGE_ORCAMENTOS = "calc:orcamentos:v1";
const STORAGE_TIERS = "calc:markupTiers:v1";
const STORAGE_INPUTS = "calc:inputs:v1";

/* ---------- dados digitados pelo usuário (rascunho persistido) ---------- */
export type CalcInputs = {
  custos: Record<string, string>;
  horasMes: string;
  mecanicos: string;
  multiplicador: number;
  pecas: Peca[];
  nomeCliente: string;
  nomeCarro: string;
};

export const EMPTY_INPUTS: CalcInputs = {
  custos: {},
  horasMes: "",
  mecanicos: "",
  multiplicador: MULT_DEFAULT,
  pecas: [novaPeca()],
  nomeCliente: "",
  nomeCarro: "",
};

export function loadInputs(): CalcInputs {
  if (typeof window === "undefined") return EMPTY_INPUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_INPUTS);
    if (!raw) return EMPTY_INPUTS;
    const saved = JSON.parse(raw) as Partial<CalcInputs>;
    if (!saved || typeof saved !== "object") return EMPTY_INPUTS;
    const pecas =
      Array.isArray(saved.pecas) && saved.pecas.length > 0
        ? saved.pecas.map((p) => ({
            ...novaPeca(),
            ...p,
            markup: Number.isFinite(p?.markup) ? p.markup : null,
          }))
        : [novaPeca()];
    return {
      ...EMPTY_INPUTS,
      ...saved,
      custos:
        saved.custos && typeof saved.custos === "object"
          ? saved.custos
          : {},
      multiplicador: Number.isFinite(saved.multiplicador)
        ? (saved.multiplicador as number)
        : MULT_DEFAULT,
      pecas,
    };
  } catch {
    return EMPTY_INPUTS;
  }
}

export function saveInputs(inputs: CalcInputs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_INPUTS, JSON.stringify(inputs));
  } catch {
    // armazenamento indisponível: ignora
  }
}

export function clearInputs(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_INPUTS);
  } catch {
    // ignora
  }
}

export function loadOrcamentos(): Orcamento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_ORCAMENTOS);
    const parsed = raw ? (JSON.parse(raw) as Orcamento[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrcamentos(list: Orcamento[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_ORCAMENTOS, JSON.stringify(list));
  } catch {
    // armazenamento indisponível (modo privado / cota): ignora silenciosamente
  }
}

export function loadTiers(): MarkupTier[] {
  if (typeof window === "undefined") return DEFAULT_MARKUP_TIERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_TIERS);
    if (!raw) return DEFAULT_MARKUP_TIERS;
    const saved = JSON.parse(raw) as { markup: number }[];
    // mantém os limites/rótulos padrão; só restaura os percentuais editados
    if (!Array.isArray(saved) || saved.length !== DEFAULT_MARKUP_TIERS.length)
      return DEFAULT_MARKUP_TIERS;
    return DEFAULT_MARKUP_TIERS.map((t, i) => ({
      ...t,
      markup: Number.isFinite(saved[i]?.markup) ? saved[i].markup : t.markup,
    }));
  } catch {
    return DEFAULT_MARKUP_TIERS;
  }
}

export function saveTiers(tiers: MarkupTier[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_TIERS,
      JSON.stringify(tiers.map((t) => ({ markup: t.markup }))),
    );
  } catch {
    // ignora
  }
}

/* ---------- mensagem de orçamento (WhatsApp / copiar) ---------- */
export function buildOrcamentoMsg(o: {
  nomeCliente: string;
  nomeCarro: string;
  pecas: PecaResumo[];
  maoDeObra: number;
  total: number;
}): string {
  const linhas: string[] = [
    `*Orçamento - ${o.nomeCliente.trim() || "Cliente"}*`,
    `Veículo - ${o.nomeCarro.trim() || "—"}`,
  ];

  const pecasValidas = o.pecas.filter(
    (p) => p.valor > 0 || (p.maoDeObra ?? 0) > 0,
  );
  for (const p of pecasValidas) {
    const qtd = p.quantidade ?? 1;
    const nome = (p.nome.trim() || "Peça") + (qtd > 1 ? ` (${qtd}x)` : "");
    linhas.push("", nome);
    if (p.valor > 0) linhas.push(`Valor: ${brl(p.valor)}`);
    if ((p.maoDeObra ?? 0) > 0)
      linhas.push(`Mão de obra: ${brl(p.maoDeObra ?? 0)}`);
  }

  linhas.push("", `*Total: ${brl(o.total)}*`);
  return linhas.join("\n");
}

export function formatData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
