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

/* ---------- parsing / formatação (pt-BR) ---------- */

/** Converte texto digitado (ex.: "1.500,50" ou "1500.5") em número. */
export function parseNum(v: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "");
  // vírgula presente → formato BR (ponto = milhar, vírgula = decimal)
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export const brl = (n: number): string =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const horasEfetivas = mecanicos > 0 ? horasMes / mecanicos : 0;
  const custoBase = horasEfetivas > 0 ? totalCustos / horasEfetivas : 0;
  const custoFinal = custoBase * multiplicador;
  return { totalCustos, horasEfetivas, custoBase, custoFinal };
}

/* ---------- Passo #02 — valor da peça ---------- */
export function tierForCost(cost: number, tiers: MarkupTier[]): MarkupTier {
  return tiers.find((t) => cost <= t.max) ?? tiers[tiers.length - 1];
}

export function precoPeca(cost: number, tiers: MarkupTier[]): number {
  if (cost <= 0) return 0;
  const tier = tierForCost(cost, tiers);
  return cost * (1 + tier.markup / 100);
}

/* ---------- Histórico de orçamentos (localStorage) ---------- */
export type Orcamento = {
  id: string;
  nomeCarro: string;
  valorHora: number;
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
  custoPeca: string;
  nomeCarro: string;
  valorHoraInput: string;
  valorPecaInput: string;
};

export const EMPTY_INPUTS: CalcInputs = {
  custos: {},
  horasMes: "",
  mecanicos: "",
  multiplicador: MULT_DEFAULT,
  custoPeca: "",
  nomeCarro: "",
  valorHoraInput: "",
  valorPecaInput: "",
};

export function loadInputs(): CalcInputs {
  if (typeof window === "undefined") return EMPTY_INPUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_INPUTS);
    if (!raw) return EMPTY_INPUTS;
    const saved = JSON.parse(raw) as Partial<CalcInputs>;
    if (!saved || typeof saved !== "object") return EMPTY_INPUTS;
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
