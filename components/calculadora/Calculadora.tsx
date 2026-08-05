"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import type { Papel } from "@/lib/db/types";
import { ERRO_GENERICO } from "@/components/auth/authLogic";
import {
  DEFAULT_SUFIXO_ORCAMENTO,
  MARKUP_MIN,
  MARKUP_MAX,
  brl,
  buildOrcamentoMsg,
  clearInputs,
  formatData,
  formatMoneyBlur,
  loadInputs,
  maoDeObraPeca,
  markupDaPeca,
  maskIntTyping,
  maskMoneyTyping,
  novaPeca,
  parseNum,
  precoPecaItem,
  quantidadePeca,
  saveInputs,
  somaMaoDeObra,
  somaPecas,
  tierForCost,
  tiersFromMarkups,
  type MarkupTier,
  type Orcamento,
  type OrigemCliente,
  type Passo1Dados,
  type Passo2ConfigDados,
  type Peca,
  type StatusOrcamento,
  type ValorHoraSalvo,
} from "./calcLogic";
import {
  AnimatedBRL,
  MoneyField,
  useConfirmacaoExclusao,
  usePulse,
} from "./calcUi";
import {
  atualizarStatusOrcamento,
  criarOrcamento,
  editarOrcamento,
  excluirOrcamento,
  salvarPasso2Config,
} from "./actions";

/** Espera após a última edição antes de persistir no banco (ms). */
const DEBOUNCE_SALVAR_MS = 800;

/** Estado do save debounced da config do Passo 2-3 — falha nunca é silenciosa. */
type SalvamentoConfig = "ocioso" | "salvando" | "salvo" | "erro";

// Passo 1 é admin-only e carregado sob demanda: o chunk com o form dos
// custos gerenciais nunca é servido quando a página renderiza para
// funcionário (DW-4.1). Os VALORES, por sua vez, só chegam via prop
// passo1Inicial — que a page só consulta/passa para admin.
const Passo1 = nextDynamic(() => import("./Passo1"));

type View = "calc" | "hist";
type Step = 1 | 2 | 3;
type FiltroPeriodo = "todos" | "semana" | "mes" | "personalizado";
type PecaAjusteRapido = {
  id: string;
  nome: string;
  quantidade: string;
  /** Custo unitário antes do markup. */
  custo: string;
  /** null usa automaticamente a faixa configurada em "Valor da peça". */
  markup: number | null;
  horas: string;
};
type OrcamentoAjusteRapido = {
  id: string;
  nomeCliente: string;
  nomeCarro: string;
  placa: string;
  contatoCliente: string;
  origem: OrigemCliente | "";
  valorHora: number;
  pecas: PecaAjusteRapido[];
};

function valorPecaAjuste(
  peca: PecaAjusteRapido,
  tiers: MarkupTier[],
): number {
  return precoPecaItem(
    {
      id: peca.id,
      nome: peca.nome,
      custo: peca.custo,
      markup: peca.markup,
      quantidade: peca.quantidade,
      horas: peca.horas,
    },
    tiers,
  );
}

const STEP_LABELS: Record<Step, string> = {
  1: "Custo da hora",
  2: "Valor da peça",
  3: "Orçamento",
};

/** Segunda-feira 00:00 da semana corrente — base do filtro "Semana". */
function inicioDaSemana(agora: Date): Date {
  const d = new Date(agora);
  const dia = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Calculadora({
  papel,
  empresaId,
  valorHoraInicial,
  passo1Inicial,
  passo2ConfigInicial,
  orcamentosIniciais,
  valorHoraHistoricoInicial,
  nomeEmpresa,
  permiteEditarOrcamentos,
  historicoCompacto,
  permiteVerCustoPecas,
}: {
  /** Papel do usuário na empresa ativa — gate do Passo 1. */
  papel: Papel;
  /** Empresa ativa: namespace do localStorage e destino de salvarPasso1. */
  empresaId: string;
  /** empresas.valor_hora do servidor — única fonte p/ funcionário. */
  valorHoraInicial: number;
  /** Insumos do Passo 1 (presente APENAS para admin; nunca p/ funcionário). */
  passo1Inicial?: Passo1Dados;
  /** Markup por faixa + sufixo do orçamento (calc_config) — qualquer membro. */
  passo2ConfigInicial?: Passo2ConfigDados;
  /** Histórico de orçamentos da empresa (banco, tabela orcamentos), mais recente primeiro. */
  orcamentosIniciais: Orcamento[];
  /** Valores hora salvos (banco, tabela valor_hora_historico), mais recente primeiro. */
  valorHoraHistoricoInicial: ValorHoraSalvo[];
  /** Nome da empresa ativa — texto da trava do valor da hora p/ funcionário. */
  nomeEmpresa: string;
  /** Permite alterar orçamentos já persistidos. */
  permiteEditarOrcamentos: boolean;
  /** Visual resumido e expansível do histórico. */
  historicoCompacto: boolean;
  /** Acesso restrito ao detalhamento interno de custo das peças. */
  permiteVerCustoPecas: boolean;
}) {
  const ehAdmin = papel === "admin";
  const [view, setView] = useState<View>("calc");
  // Funcionário não tem Passo 1: começa direto no valor da peça.
  const [step, setStep] = useState<Step>(ehAdmin ? 1 : 2);

  // Valor da hora: admin recebe atualizações ao vivo do Passo1 (banco);
  // funcionário usa o consolidado do servidor (empresas.valor_hora) e só.
  const [valorHora, setValorHora] = useState(valorHoraInicial);

  // Passo #02 — markup por faixa: vem do banco (calc_config), qualquer
  // membro lê/edita e reutiliza os valores que a empresa definiu.
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [expandedId, setExpandedId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tiers, setTiers] = useState<MarkupTier[]>(() =>
    tiersFromMarkups(passo2ConfigInicial?.markupTiers ?? []),
  );

  // Passo #03 — sufixo do orçamento: também vem do banco (calc_config).
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomeCarro, setNomeCarro] = useState("");
  const [placa, setPlaca] = useState("");
  const [contatoCliente, setContatoCliente] = useState("");
  const [origem, setOrigem] = useState<OrigemCliente | "">("");
  const [sufixoOrcamento, setSufixoOrcamento] = useState(
    passo2ConfigInicial?.sufixoOrcamento ?? DEFAULT_SUFIXO_ORCAMENTO,
  );
  const [salvamentoConfig, setSalvamentoConfig] =
    useState<SalvamentoConfig>("ocioso");

  // Histórico — vem do banco (tabela orcamentos), compartilhado entre os
  // membros da empresa; o estado local só reflete as mudanças desta sessão.
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(orcamentosIniciais);
  // Filtros do histórico: todos por padrão; semana, mês e intervalo
  // personalizado disponíveis para todos os usuários.
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"" | StatusOrcamento>("");
  const [busca, setBusca] = useState("");
  const [copiadoId, setCopiadoId] = useState("");
  const [placaCopiadaId, setPlacaCopiadaId] = useState("");
  const [orcamentoAbertoId, setOrcamentoAbertoId] = useState("");
  const [detalheCustoId, setDetalheCustoId] = useState("");
  const [ajusteRapido, setAjusteRapido] =
    useState<OrcamentoAjusteRapido | null>(null);
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [erroAjuste, setErroAjuste] = useState("");
  // Relatório XLSX por período (datas independentes do filtro da lista).
  const [expInicio, setExpInicio] = useState("");
  const [expFim, setExpFim] = useState("");
  const [exportando, setExportando] = useState(false);
  // Histórico de valores hora: alimentado pelo Passo 1 (admin) e usado no
  // Passo 3 — o orçamento mostra o padrão e deixa escolher outro ativo.
  const [histValorHora, setHistValorHora] = useState<ValorHoraSalvo[]>(
    valorHoraHistoricoInicial,
  );
  const [valorHoraSelId, setValorHoraSelId] = useState("");
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [erroOrcamento, setErroOrcamento] = useState("");
  const [atualizandoStatusId, setAtualizandoStatusId] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const { pedirConfirmacao, dialogConfirmacao } = useConfirmacaoExclusao();

  // só persiste depois de reidratar (evita sobrescrever o salvo com o estado inicial vazio)
  const [hydrated, setHydrated] = useState(false);

  // hidrata o rascunho (Passos 2-3) do localStorage no cliente (evita
  // mismatch de SSR); as chaves têm namespace por empresa — dados de outra
  // empresa não vazam. O histórico de orçamentos já chega pronto do
  // servidor via orcamentosIniciais (banco), não precisa hidratar aqui.
  useEffect(() => {
    const saved = loadInputs(empresaId);
    // reaplica a máscara de moeda aos valores salvos
    const pecasFmt = saved.pecas.map((p) => ({
      ...p,
      custo: formatMoneyBlur(p.custo),
    }));
    setPecas(pecasFmt);
    setExpandedId(pecasFmt[pecasFmt.length - 1]?.id ?? "");
    setNomeCliente(saved.nomeCliente);
    setNomeCarro(saved.nomeCarro);
    setPlaca(saved.placa);
    setHydrated(true);
  }, [empresaId]);

  // markup por faixa + sufixo do orçamento: persistidos no banco
  // (calc_config), com debounce — o estado inicial JÁ é o que está salvo
  // (veio via prop passo2ConfigInicial), então não salva na montagem.
  const montadoConfigRef = useRef(false);
  const seqConfigRef = useRef(0);
  useEffect(() => {
    if (!montadoConfigRef.current) {
      montadoConfigRef.current = true;
      return;
    }
    setSalvamentoConfig("salvando");
    const seq = ++seqConfigRef.current;
    const id = window.setTimeout(() => {
      salvarPasso2Config(empresaId, {
        markupTiers: tiers.map((t) => t.markup),
        sufixoOrcamento,
      })
        .then((r) => {
          if (seq !== seqConfigRef.current) return;
          setSalvamentoConfig(r.ok ? "salvo" : "erro");
        })
        .catch(() => {
          if (seq === seqConfigRef.current) setSalvamentoConfig("erro");
        });
    }, DEBOUNCE_SALVAR_MS);
    return () => window.clearTimeout(id);
  }, [empresaId, tiers, sufixoOrcamento]);

  // persiste os dados digitados pelo usuário (Passos 2-3; o Passo 1 mora
  // no banco e nunca entra neste payload)
  useEffect(() => {
    if (!hydrated) return;
    saveInputs({ pecas, nomeCliente, nomeCarro, placa }, empresaId);
  }, [hydrated, pecas, nomeCliente, nomeCarro, placa, empresaId]);

  /* ---------- derivados ---------- */
  // Valor da hora usado no orçamento: o registro selecionado do histórico
  // (default: o padrão); sem histórico, cai no valor ao vivo do Passo 1 /
  // empresas.valor_hora — comportamento anterior.
  const padraoVH = histValorHora.find((h) => h.status === "padrao");
  const selecionaveisVH = useMemo(
    () => histValorHora.filter((h) => h.status !== "inativo"),
    [histValorHora],
  );
  const vhSelecionado =
    selecionaveisVH.find((h) => h.id === valorHoraSelId) ?? padraoVH;
  const valorHoraOrcamento = vhSelecionado
    ? vhSelecionado.valorHora
    : valorHora;

  const pecasTotal = useMemo(() => somaPecas(pecas, tiers), [pecas, tiers]);

  const expandedPeca = pecas.find((p) => p.id === expandedId) ?? pecas[0];
  const expandedCustoNum = expandedPeca ? parseNum(expandedPeca.custo) : 0;
  const expandedTier = useMemo(
    () => tierForCost(expandedCustoNum, tiers),
    [expandedCustoNum, tiers],
  );

  const pecasValidas = useMemo(
    () => pecas.filter((p) => parseNum(p.custo) > 0),
    [pecas],
  );
  const maoDeObraTotal = useMemo(
    () => somaMaoDeObra(pecasValidas, valorHoraOrcamento),
    [pecasValidas, valorHoraOrcamento],
  );
  const totalOrcamento = maoDeObraTotal + pecasTotal;

  const pulsePeca = usePulse(Math.round(pecasTotal));
  const pulseTotal = usePulse(Math.round(totalOrcamento));

  const intervaloInvalido =
    filtroPeriodo === "personalizado" &&
    Boolean(dataInicio && dataFim && dataInicio > dataFim);

  // Lista do histórico após período, status e busca.
  const orcamentosFiltrados = useMemo(() => {
    const agora = new Date();
    const inicioSemana = inicioDaSemana(agora);
    const inicioPersonalizado = dataInicio
      ? new Date(`${dataInicio}T00:00:00`)
      : null;
    const fimPersonalizadoExclusivo = dataFim
      ? new Date(`${dataFim}T00:00:00`)
      : null;
    fimPersonalizadoExclusivo?.setDate(
      fimPersonalizadoExclusivo.getDate() + 1,
    );
    const termo = busca.trim().toLowerCase();
    return orcamentos.filter((o) => {
      const d = new Date(o.data);
      let periodoOk = true;
      if (filtroPeriodo === "mes") {
        periodoOk =
          d.getMonth() === agora.getMonth() &&
          d.getFullYear() === agora.getFullYear();
      } else if (filtroPeriodo === "semana") {
        periodoOk = d >= inicioSemana;
      } else if (filtroPeriodo === "personalizado") {
        periodoOk =
          !intervaloInvalido &&
          (!inicioPersonalizado || d >= inicioPersonalizado) &&
          (!fimPersonalizadoExclusivo || d < fimPersonalizadoExclusivo);
      }
      const statusOk = !filtroStatus || o.status === filtroStatus;
      const buscaOk =
        !termo ||
        [o.placa, o.nomeCliente, o.nomeCarro].some((v) =>
          (v ?? "").toLowerCase().includes(termo),
        );
      return periodoOk && statusOk && buscaOk;
    });
  }, [
    orcamentos,
    filtroPeriodo,
    dataInicio,
    dataFim,
    intervaloInvalido,
    filtroStatus,
    busca,
  ]);

  // Totais do histórico por status — sobre a lista filtrada (o que se vê).
  const totalPendente = useMemo(
    () =>
      orcamentosFiltrados
        .filter((o) => o.status === "Aguardando aprovação")
        .reduce((acc, o) => acc + o.total, 0),
    [orcamentosFiltrados],
  );
  const totalAprovado = useMemo(
    () =>
      orcamentosFiltrados
        .filter((o) => o.status === "Aprovado")
        .reduce((acc, o) => acc + o.total, 0),
    [orcamentosFiltrados],
  );
  const totalReprovado = useMemo(
    () =>
      orcamentosFiltrados
        .filter((o) => o.status === "Não aprovado")
        .reduce((acc, o) => acc + o.total, 0),
    [orcamentosFiltrados],
  );
  const saldoOrigens = useMemo(
    () => ({
      ligacao: orcamentosFiltrados.filter((o) => o.origem === "Ligação").length,
      whatsapp: orcamentosFiltrados.filter((o) => o.origem === "WhatsApp").length,
      pessoalmente: orcamentosFiltrados.filter((o) => o.origem === "Pessoalmente").length,
    }),
    [orcamentosFiltrados],
  );
  const totaisAjusteRapido = useMemo(() => {
    if (!ajusteRapido) return { pecas: 0, maoDeObra: 0, total: 0 };
    const totalPecas = ajusteRapido.pecas.reduce(
      (total, p) => total + valorPecaAjuste(p, tiers),
      0,
    );
    const totalMaoDeObra = ajusteRapido.pecas.reduce(
      (total, p) =>
        total + parseNum(p.horas) * ajusteRapido.valorHora,
      0,
    );
    return {
      pecas: totalPecas,
      maoDeObra: totalMaoDeObra,
      total: totalPecas + totalMaoDeObra,
    };
  }, [ajusteRapido, tiers]);

  /* ---------- navegação ---------- */
  function goToStep(next: Step) {
    setStep(next);
  }

  // Limpa os Passos 2-3 (peças, cliente, rascunho local). O botão fica no
  // Passo 1: o componente Passo1 limpa os próprios campos e chama isto.
  function limparResto() {
    const p = novaPeca();
    setPecas([p]);
    setExpandedId(p.id);
    setNomeCliente("");
    setNomeCarro("");
    setPlaca("");
    setContatoCliente("");
    setOrigem("");
    clearInputs(empresaId);
  }

  function setTierMarkup(index: number, value: string) {
    const n = parseNum(value);
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, markup: n } : t)),
    );
  }

  /* ---------- peças ---------- */
  function setPecaField(
    id: string,
    field: "nome" | "custo" | "quantidade" | "horas",
    value: string,
  ) {
    setPecas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function setPecaMarkup(id: string, value: number) {
    const clamped = Math.max(MARKUP_MIN, Math.min(MARKUP_MAX, value));
    setPecas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, markup: clamped } : p)),
    );
  }

  function addPeca() {
    const p = novaPeca();
    setPecas((prev) => [...prev, p]);
    setExpandedId(p.id);
  }

  async function removePeca(id: string) {
    if (!(await pedirConfirmacao())) return;
    setPecas((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const list = next.length > 0 ? next : [novaPeca()];
      if (id === expandedId) setExpandedId(list[list.length - 1].id);
      return list;
    });
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function togglePecaSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPecas() {
    setSelectedIds((prev) =>
      prev.size === pecas.length ? new Set() : new Set(pecas.map((p) => p.id)),
    );
  }

  async function removeSelectedPecas() {
    if (!(await pedirConfirmacao())) return;
    setPecas((prev) => {
      const next = prev.filter((p) => !selectedIds.has(p.id));
      const list = next.length > 0 ? next : [novaPeca()];
      if (selectedIds.has(expandedId)) setExpandedId(list[list.length - 1].id);
      return list;
    });
    setSelectedIds(new Set());
  }

  function pecasResumo() {
    return pecasValidas.map((p) => ({
      nome: p.nome.trim() || "Peça",
      quantidade: quantidadePeca(p),
      valor: precoPecaItem(p, tiers),
      maoDeObra: maoDeObraPeca(p, valorHoraOrcamento),
      custo: parseNum(p.custo),
      markup: markupDaPeca(p, tiers),
    }));
  }

  function mensagemOrcamento(): string {
    return buildOrcamentoMsg({
      nomeCliente,
      nomeCarro,
      placa,
      pecas: pecasResumo(),
      maoDeObra: maoDeObraTotal,
      total: totalOrcamento,
      sufixo: sufixoOrcamento,
    });
  }

  async function copiarOrcamento() {
    try {
      await navigator.clipboard.writeText(mensagemOrcamento());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard indisponível: ignora
    }
  }

  function enviarWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(mensagemOrcamento())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function salvarOrcamento() {
    setSalvandoOrcamento(true);
    setErroOrcamento("");
    const dados = {
      nomeCliente: nomeCliente.trim(),
      nomeCarro: nomeCarro.trim() || "Sem nome",
      placa: placa.trim(),
      contatoCliente,
      origem: origem || null,
      valorHora: valorHoraOrcamento,
      horas: pecasValidas.reduce((acc, p) => acc + parseNum(p.horas), 0),
      maoDeObra: maoDeObraTotal,
      pecas: pecasResumo(),
      valorPeca: pecasTotal,
      total: totalOrcamento,
    };
    try {
      const resultado = await criarOrcamento(empresaId, dados);
      if (!resultado.ok) {
        setErroOrcamento(resultado.error);
        return;
      }
      setOrcamentos((prev) => [resultado.orcamento, ...prev]);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2600);
    } catch {
      setErroOrcamento(ERRO_GENERICO);
    } finally {
      setSalvandoOrcamento(false);
    }
  }

  function novoOrcamento() {
    const p = novaPeca();
    setErroOrcamento("");
    setNomeCliente("");
    setNomeCarro("");
    setPlaca("");
    setContatoCliente("");
    setOrigem("");
    setPecas([p]);
    setExpandedId(p.id);
    setSelectedIds(new Set());
    setView("calc");
    setStep(2);
  }

  function abrirEdicaoOrcamento(o: Orcamento) {
    if (!permiteEditarOrcamentos) return;

    const temMaoDeObraPorItem = (o.pecas ?? []).some(
      (peca) => Number(peca.maoDeObra ?? 0) > 0,
    );
    const horasTotais =
      o.valorHora > 0
        ? Number(o.maoDeObra ?? 0) / o.valorHora
        : Number(o.horas ?? 0);
    const pecasRecuperadas: PecaAjusteRapido[] = (o.pecas ?? []).map((peca, index) => {
      const horas =
        o.valorHora > 0 && Number(peca.maoDeObra ?? 0) > 0
          ? Number(peca.maoDeObra) / o.valorHora
          : !temMaoDeObraPorItem && index === 0
            ? horasTotais
            : 0;
      return {
        id: crypto.randomUUID(),
        nome: peca.nome,
        quantidade: String(Math.max(1, Number(peca.quantidade) || 1)),
        // Orçamentos novos preservam custo e markup. Para os antigos,
        // reconstruímos pelo preço final sem alterar o total já registrado.
        custo: (
          peca.custo ??
          Number(peca.valor) / Math.max(1, Number(peca.quantidade) || 1)
        ).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        markup: peca.markup ?? 0,
        horas: horas
          ? horas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
          : "",
      };
    });
    setAjusteRapido({
      id: o.id,
      nomeCliente: o.nomeCliente,
      nomeCarro: o.nomeCarro,
      placa: o.placa,
      contatoCliente: o.contatoCliente ?? "",
      origem: o.origem ?? "",
      valorHora: o.valorHora,
      pecas: pecasRecuperadas,
    });
    setErroAjuste("");
  }

  function atualizarAjusteRapido(
    campo: "nomeCliente" | "nomeCarro" | "placa" | "contatoCliente" | "origem",
    valor: string,
  ) {
    setAjusteRapido((atual) =>
      atual ? { ...atual, [campo]: valor } : atual,
    );
  }

  function atualizarPecaAjuste(
    id: string,
    campo: "nome" | "quantidade" | "custo" | "horas" | "markup",
    valor: string | number | null,
  ) {
    setAjusteRapido((atual) =>
      atual
        ? {
            ...atual,
            pecas: atual.pecas.map((p) =>
              p.id === id ? { ...p, [campo]: valor } : p,
            ),
          }
        : atual,
    );
  }

  function adicionarPecaAjuste() {
    setAjusteRapido((atual) =>
      atual
        ? {
            ...atual,
            pecas: [
              ...atual.pecas,
              {
                id: crypto.randomUUID(),
                nome: "",
                quantidade: "1",
                custo: "",
                markup: null,
                horas: "",
              },
            ],
          }
        : atual,
    );
  }

  async function excluirPecaAjuste(id: string) {
    if (!(await pedirConfirmacao())) return;
    setAjusteRapido((atual) =>
      atual
        ? { ...atual, pecas: atual.pecas.filter((p) => p.id !== id) }
        : atual,
    );
  }

  async function salvarAjusteRapido() {
    if (!ajusteRapido || salvandoAjuste) return;
    setSalvandoAjuste(true);
    setErroAjuste("");
    const pecasOrigem =
      ajusteRapido.pecas.length > 0
        ? ajusteRapido.pecas
        : [{
            id: crypto.randomUUID(),
            nome: "Peça",
            quantidade: "1",
            custo: "",
            markup: null,
            horas: "",
          }];
    const pecasAjustadas = pecasOrigem.map((p) => ({
      nome: p.nome.trim() || "Peça",
      quantidade: Math.max(1, parseNum(p.quantidade)),
      valor: valorPecaAjuste(p, tiers),
      maoDeObra: parseNum(p.horas) * ajusteRapido.valorHora,
      custo: parseNum(p.custo),
      markup:
        p.markup ?? tierForCost(parseNum(p.custo), tiers).markup,
    }));
    const valorPeca = pecasAjustadas.reduce((total, p) => total + p.valor, 0);
    const horas = pecasOrigem.reduce(
      (total, p) => total + parseNum(p.horas),
      0,
    );
    const maoDeObra = horas * ajusteRapido.valorHora;
    try {
      const resultado = await editarOrcamento(
        empresaId,
        ajusteRapido.id,
        {
          nomeCliente: ajusteRapido.nomeCliente,
          nomeCarro: ajusteRapido.nomeCarro,
          placa: ajusteRapido.placa,
          contatoCliente: ajusteRapido.contatoCliente,
          origem: ajusteRapido.origem || null,
          valorHora: ajusteRapido.valorHora,
          horas,
          maoDeObra,
          pecas: pecasAjustadas,
          valorPeca,
          total: valorPeca + maoDeObra,
        },
      );
      if (!resultado.ok) {
        setErroAjuste(resultado.error);
        return;
      }
      setOrcamentos((prev) =>
        prev.map((o) => (o.id === resultado.orcamento.id ? resultado.orcamento : o)),
      );
      setAjusteRapido(null);
    } catch {
      setErroAjuste(ERRO_GENERICO);
    } finally {
      setSalvandoAjuste(false);
    }
  }

  async function excluirOrcamentoDoAjuste() {
    if (!ajusteRapido || salvandoAjuste) return;
    if (!(await pedirConfirmacao())) return;
    const id = ajusteRapido.id;
    setSalvandoAjuste(true);
    try {
      const resultado = await excluirOrcamento(empresaId, id);
      if (!resultado.ok) {
        setErroAjuste(resultado.error);
        return;
      }
      setOrcamentos((prev) => prev.filter((o) => o.id !== id));
      setAjusteRapido(null);
    } catch {
      setErroAjuste(ERRO_GENERICO);
    } finally {
      setSalvandoAjuste(false);
    }
  }

  function reenviarWhatsApp(o: Orcamento) {
    const msg = buildOrcamentoMsg({
      nomeCliente: o.nomeCliente,
      nomeCarro: o.nomeCarro,
      placa: o.placa,
      pecas: o.pecas ?? [],
      maoDeObra: o.maoDeObra ?? o.valorHora ?? 0,
      total: o.total,
      sufixo: sufixoOrcamento,
    });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copiarOrcamentoHistorico(o: Orcamento) {
    try {
      await navigator.clipboard.writeText(
        buildOrcamentoMsg({
          nomeCliente: o.nomeCliente,
          nomeCarro: o.nomeCarro,
          placa: o.placa,
          pecas: o.pecas ?? [],
          maoDeObra: o.maoDeObra ?? o.valorHora ?? 0,
          total: o.total,
          sufixo: sufixoOrcamento,
        }),
      );
      setCopiadoId(o.id);
      window.setTimeout(
        () => setCopiadoId((atual) => (atual === o.id ? "" : atual)),
        2200,
      );
    } catch {
      // clipboard indisponível: ignora
    }
  }

  async function copiarPlacaHistorico(o: Orcamento) {
    if (!o.placa) return;
    try {
      await navigator.clipboard.writeText(o.placa);
      setPlacaCopiadaId(o.id);
      window.setTimeout(
        () => setPlacaCopiadaId((atual) => (atual === o.id ? "" : atual)),
        1800,
      );
    } catch {
      // Clipboard indisponível: mantém a lista sem alterações.
    }
  }

  async function exportarXlsx() {
    if (exportando) return;
    setExportando(true);
    try {
      const XLSX = await import("xlsx");
      const ini = expInicio ? new Date(`${expInicio}T00:00:00`) : null;
      const fim = expFim ? new Date(`${expFim}T23:59:59.999`) : null;
      const linhas = orcamentos
        .filter((o) => {
          const d = new Date(o.data);
          return (!ini || d >= ini) && (!fim || d <= fim);
        })
        .map((o) => ({
          Data: formatData(o.data),
          Cliente: o.nomeCliente,
          Veículo: o.nomeCarro,
          Placa: o.placa,
          "Valor hora (R$)": o.valorHora,
          Horas: o.horas,
          "Mão de obra (R$)": o.maoDeObra,
          "Peças (R$)": o.valorPeca,
          "Total (R$)": o.total,
          Status: o.status,
        }));
      const ws = XLSX.utils.json_to_sheet(linhas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orçamentos");
      XLSX.writeFile(
        wb,
        `orcamentos-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } finally {
      setExportando(false);
    }
  }

  async function removerOrcamento(id: string) {
    if (!(await pedirConfirmacao())) return;
    const anterior = orcamentos;
    setOrcamentos((prev) => prev.filter((o) => o.id !== id));
    try {
      const resultado = await excluirOrcamento(empresaId, id);
      if (!resultado.ok) setOrcamentos(anterior);
    } catch {
      setOrcamentos(anterior);
    }
  }

  async function alterarStatusOrcamento(id: string, status: StatusOrcamento) {
    const anterior = orcamentos;
    setAtualizandoStatusId(id);
    setOrcamentos((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o)),
    );
    try {
      const resultado = await atualizarStatusOrcamento(empresaId, id, status);
      if (!resultado.ok) setOrcamentos(anterior);
    } catch {
      setOrcamentos(anterior);
    } finally {
      setAtualizandoStatusId("");
    }
  }

  // Passos exibidos: funcionário não tem o Passo 1; a numeração da UI é o
  // índice na lista (1..n), então para ele "Valor da peça" vira o Passo 1.
  const stepsVisiveis: Step[] = ehAdmin ? [1, 2, 3] : [2, 3];

  return (
    <section className="calc-page relative min-h-[100svh] py-20 sm:py-24">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[920px]">
        {/* ---------- cabeçalho ---------- */}
        <header className="text-center mb-9">
          <span className="tag">Ferramenta de precificação</span>
          <h1 className="section-title mt-5">
            Calculadora de <span className="text-blue">Precificação</span>
          </h1>
          <p className="lead mt-4 max-w-[560px] mx-auto">
            Descubra o custo real da sua hora, precifique peças com o markup
            certo e monte orçamentos em segundos.
          </p>
        </header>

        {/* ---------- alternância calculadora / histórico ---------- */}
        <div className="calc-tabs mb-8">
          <button
            className={`calc-tab ${view === "calc" ? "is-active" : ""}`}
            onClick={() => setView("calc")}
          >
            Calculadora
          </button>
          <button
            className={`calc-tab ${view === "hist" ? "is-active" : ""}`}
            onClick={() => setView("hist")}
          >
            Histórico
            {orcamentos.length > 0 && (
              <span className="calc-tab-badge">{orcamentos.length}</span>
            )}
          </button>
        </div>

        {view === "calc" && (
          <>
            {/* stepper */}
            <div className="calc-steps mb-9">
              {stepsVisiveis.map((n, i) => (
                <button
                  key={n}
                  className={`calc-step-pill ${step === n ? "is-active" : ""} ${
                    step > n ? "is-done" : ""
                  }`}
                  onClick={() => goToStep(n)}
                >
                  <span className="calc-step-num">{i + 1}</span>
                  <span className="calc-step-label">{STEP_LABELS[n]}</span>
                </button>
              ))}
            </div>

            {/* ============ PASSO 2 ============ */}
            {step === 2 && (
              <div className="cta-reveal">
                <div className="calc-card">
                  <p className="calc-card-kicker">
                    Passo {ehAdmin ? "02" : "01"} — Valor da peça
                  </p>
                  <h2 className="calc-card-title">Precificação das peças</h2>
                  <p className="calc-card-sub">
                    Adicione as peças do orçamento. O markup é aplicado
                    automaticamente conforme a faixa — e você pode ajustar na
                    régua.
                  </p>

                  {/* lista de peças (acordeão) */}
                  <div className="calc-pecas-toolbar">
                    <label className="calc-select-all">
                      <input
                        type="checkbox"
                        checked={
                          pecas.length > 0 && selectedIds.size === pecas.length
                        }
                        onChange={toggleSelectAllPecas}
                      />
                      Selecionar todas
                    </label>
                    {selectedIds.size > 0 && (
                      <button
                        type="button"
                        className="calc-peca-del"
                        onClick={removeSelectedPecas}
                      >
                        Excluir selecionadas ({selectedIds.size})
                      </button>
                    )}
                  </div>
                  <div className="calc-pecas mt-6">
                    {pecas.map((p, i) => {
                      const custoNum = parseNum(p.custo);
                      const valor = precoPecaItem(p, tiers);
                      const isOpen = p.id === expandedId;
                      const mk = markupDaPeca(p, tiers);
                      return (
                        <div
                          key={p.id}
                          className={`calc-peca ${isOpen ? "is-open" : ""}`}
                        >
                          <div className="calc-peca-headrow">
                            <span className="calc-peca-chk">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(p.id)}
                                onChange={() => togglePecaSelected(p.id)}
                                aria-label={`Selecionar ${p.nome.trim() || "peça"}`}
                              />
                            </span>
                            <button
                              type="button"
                              className="calc-peca-head"
                              onClick={() => setExpandedId(isOpen ? "" : p.id)}
                            >
                              <span className="calc-peca-idx">{i + 1}</span>
                              <span className="calc-peca-name">
                                {p.nome.trim() || "Nova peça"}
                              </span>
                              <span className="calc-peca-val">
                                {custoNum > 0 ? brl(valor) : "—"}
                              </span>
                              <span className="calc-peca-chev" aria-hidden="true">
                                ⌄
                              </span>
                            </button>
                          </div>

                          {isOpen && (
                            <div className="calc-peca-body">
                              <div className="calc-peca-row">
                                <label className="grid gap-1.5">
                                  <span className="quiz-label">Nome da peça</span>
                                  <input
                                    type="text"
                                    className="quiz-input"
                                    placeholder="ex.: Pastilha de freio"
                                    value={p.nome}
                                    onChange={(e) =>
                                      setPecaField(p.id, "nome", e.target.value)
                                    }
                                  />
                                </label>
                                <label className="grid gap-1.5 calc-qtd">
                                  <span className="quiz-label">Qtd.</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    className="quiz-input"
                                    placeholder="1"
                                    value={p.quantidade}
                                    onChange={(e) =>
                                      setPecaField(
                                        p.id,
                                        "quantidade",
                                        maskIntTyping(e.target.value),
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <MoneyField
                                label="Custo real da peça"
                                value={p.custo}
                                onChange={(v) => setPecaField(p.id, "custo", v)}
                              />

                              {/* régua de ajuste do markup */}
                              <div className="calc-mult">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="quiz-label">
                                    Markup da peça
                                  </span>
                                  <span className="calc-mult-value">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={String(mk)}
                                      onChange={(e) =>
                                        setPecaMarkup(
                                          p.id,
                                          Number(e.target.value.replace(/\D/g, "")) || 0,
                                        )
                                      }
                                    />
                                    %
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  className="calc-range"
                                  min={MARKUP_MIN}
                                  max={MARKUP_MAX}
                                  step={1}
                                  value={mk}
                                  onChange={(e) =>
                                    setPecaMarkup(p.id, Number(e.target.value))
                                  }
                                />
                                <p className="calc-warn">
                                  <span aria-hidden="true">⚠</span> Ajuste entre{" "}
                                  <b>{MARKUP_MIN}%</b> e <b>{MARKUP_MAX}%</b>.
                                  Sugestão da faixa:{" "}
                                  <b className="calc-suggestion">
                                    {tierForCost(custoNum, tiers).markup}%
                                  </b>
                                  .
                                </p>
                              </div>

                              {pecas.length > 1 && (
                                <button
                                  type="button"
                                  className="calc-peca-del"
                                  onClick={() => removePeca(p.id)}
                                >
                                  Remover peça
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button type="button" className="calc-add" onClick={addPeca}>
                    + Adicionar peça
                  </button>

                  {/* tabela de markup editável */}
                  <div className="calc-divider" />
                  <p className="quiz-label mb-3">
                    Sugestão de markup em peças{" "}
                    <span className="calc-edit-hint">(edite os % se quiser)</span>
                  </p>
                  <div className="calc-tiers">
                    {tiers.map((t, i) => {
                      const active =
                        expandedCustoNum > 0 && t === expandedTier;
                      return (
                        <div
                          key={t.label}
                          className={`calc-tier ${active ? "is-active" : ""}`}
                        >
                          <span className="calc-tier-range">{t.label}</span>
                          <span className="calc-tier-input">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={String(t.markup)}
                              onChange={(e) => setTierMarkup(i, e.target.value)}
                            />
                            <span>%</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`calc-readout mt-6 ${pulsePeca ? "is-pulsing" : ""}`}>
                  {pecasValidas.length > 0 && (
                    <div className="calc-pecas-detalhamento">
                      <span className="calc-pecas-detalhamento-titulo">
                        Detalhamento das peças
                      </span>
                      {pecasValidas.map((p) => {
                        const quantidade = quantidadePeca(p);
                        const custoUnitario = parseNum(p.custo);
                        const custoOriginal = custoUnitario * quantidade;
                        const markup = markupDaPeca(p, tiers);
                        const valorFinal = precoPecaItem(p, tiers);
                        return (
                          <div className="calc-peca-detalhe" key={p.id}>
                            <div className="calc-peca-detalhe-identificacao">
                              <b>{p.nome.trim() || "Peça"}</b>
                              <small>
                                {quantidade} {quantidade === 1 ? "unidade" : "unidades"}
                                {quantidade > 1 && ` · ${brl(custoUnitario)} cada`}
                              </small>
                            </div>
                            <span>
                              <i>Custo original</i>
                              <b>{brl(custoOriginal)}</b>
                            </span>
                            <span>
                              <i>Markup aplicado</i>
                              <b>{markup}%</b>
                            </span>
                            <strong>
                              <i>Valor final</i>
                              <b>{brl(valorFinal)}</b>
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="calc-readout-breakdown">
                    <div>
                      <span className="calc-readout-k">Peças</span>
                      <span className="calc-readout-v">
                        {pecas.filter((p) => parseNum(p.custo) > 0).length}
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Custo original total</span>
                      <span className="calc-readout-v">
                        {brl(
                          pecasValidas.reduce(
                            (total, p) =>
                              total + parseNum(p.custo) * quantidadePeca(p),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="calc-readout-main">
                    <span className="calc-readout-main-k">Total em peças</span>
                    <span className="calc-readout-num">
                      <AnimatedBRL value={pecasTotal} />
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-7">
                  {ehAdmin ? (
                    <button className="calc-back" onClick={() => goToStep(1)}>
                      ← Voltar
                    </button>
                  ) : (
                    <span />
                  )}
                  <button className="btn" onClick={() => goToStep(3)}>
                    Montar orçamento →
                  </button>
                </div>
              </div>
            )}

            {/* ============ PASSO 3 ============ */}
            {step === 3 && (
              <div className="cta-reveal">
                <div className="calc-card">
                  <p className="calc-card-kicker">
                    Passo {ehAdmin ? "03" : "02"} — Orçamento
                  </p>
                  <h2 className="calc-card-title">Cliente, mão de obra e peças</h2>
                  <p className="calc-card-sub">
                    Informe o cliente e as horas de serviço de cada peça.{" "}
                    {ehAdmin
                      ? "O valor da hora vem do Passo 01 e fica travado."
                      : "O valor da hora é definido pela sua oficina e fica travado."}
                  </p>

                  <div className="grid gap-4 mt-6">
                    <div className="calc-grid-2">
                      <label className="grid gap-1.5">
                        <span className="quiz-label">Nome do cliente</span>
                        <input
                          type="text"
                          className="quiz-input"
                          placeholder="ex.: João Silva"
                          value={nomeCliente}
                          onChange={(e) => setNomeCliente(e.target.value)}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="quiz-label">Veículo</span>
                        <input
                          type="text"
                          className="quiz-input"
                          placeholder="ex.: Onix 1.4"
                          value={nomeCarro}
                          onChange={(e) => setNomeCarro(e.target.value)}
                        />
                      </label>
                    </div>

                    {permiteVerCustoPecas && (
                      <div className="calc-grid-2 calc-campos-teste">
                        <label className="grid gap-1.5">
                          <span className="quiz-label">Contato</span>
                          <input
                            type="tel"
                            inputMode="tel"
                            className="quiz-input"
                            placeholder="ex.: (51) 99999-9999"
                            value={contatoCliente}
                            maxLength={30}
                            onChange={(e) => setContatoCliente(e.target.value)}
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="quiz-label">Origem</span>
                          <select
                            className="quiz-input"
                            value={origem}
                            onChange={(e) =>
                              setOrigem(e.target.value as OrigemCliente | "")
                            }
                          >
                            <option value="">Selecione a origem</option>
                            <option value="Ligação">Ligação</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Pessoalmente">Pessoalmente</option>
                          </select>
                        </label>
                      </div>
                    )}

                    <div className="calc-grid-2">
                      <label className="grid gap-1.5">
                        <span className="quiz-label">Placa do veículo</span>
                        <input
                          type="text"
                          className="quiz-input"
                          placeholder="ex.: ABC1D23"
                          value={placa}
                          maxLength={8}
                          onChange={(e) =>
                            setPlaca(e.target.value.toUpperCase())
                          }
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="quiz-label">
                          Valor da hora{" "}
                          <span className="calc-lock-tag">
                            🔒{" "}
                            {selecionaveisVH.length > 0
                              ? "do histórico de valor hora"
                              : ehAdmin
                                ? "definido no Passo 01"
                                : `definido por ${nomeEmpresa}`}
                          </span>
                        </span>
                        {selecionaveisVH.length > 0 ? (
                          <select
                            className="quiz-input"
                            value={vhSelecionado?.id ?? ""}
                            onChange={(e) => setValorHoraSelId(e.target.value)}
                            aria-label="Valor da hora do orçamento"
                          >
                            {!vhSelecionado && (
                              <option value="">
                                Valor atual — {brl(valorHora)}
                              </option>
                            )}
                            {selecionaveisVH.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.nome} — {brl(h.valorHora)}
                                {h.status === "padrao" ? " (padrão)" : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="calc-money calc-money--locked">
                            <span className="calc-money-prefix">R$</span>
                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={valorHora.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            />
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  {pecasValidas.length > 0 && (
                    <>
                      <div className="calc-divider" />
                      <p className="quiz-label mb-3">
                        Horas de serviço por peça
                      </p>
                      <div className="calc-pecas-horas">
                        {pecasValidas.map((p) => (
                          <div key={p.id} className="calc-ph">
                            <div className="calc-ph-info">
                              <span className="calc-ph-name">
                                {p.nome.trim() || "Peça"}
                                {quantidadePeca(p) > 1 && (
                                  <span className="calc-ph-qtd">
                                    ×{quantidadePeca(p)}
                                  </span>
                                )}
                              </span>
                              <span className="calc-ph-val">
                                {brl(precoPecaItem(p, tiers))}
                              </span>
                            </div>
                            <label className="calc-ph-hours">
                              <span className="quiz-label">Horas</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="quiz-input"
                                placeholder="ex.: 2 ou 1,5"
                                value={p.horas}
                                onChange={(e) =>
                                  setPecaField(
                                    p.id,
                                    "horas",
                                    maskMoneyTyping(e.target.value),
                                  )
                                }
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="calc-divider" />
                  <label className="grid gap-1.5">
                    <span className="quiz-label">
                      Mensagem final do orçamento{" "}
                      <span className="calc-edit-hint">
                        (aparece no fim da mensagem copiada/enviada)
                      </span>
                    </span>
                    <textarea
                      className="quiz-input calc-sufixo"
                      rows={6}
                      value={sufixoOrcamento}
                      onChange={(e) => setSufixoOrcamento(e.target.value)}
                    />
                  </label>
                  {salvamentoConfig !== "ocioso" && (
                    <p
                      className={`mt-2 ${
                        salvamentoConfig === "erro" ? "calc-warn" : "calc-saved"
                      }`}
                      role="status"
                    >
                      {salvamentoConfig === "salvando" && "Salvando…"}
                      {salvamentoConfig === "salvo" &&
                        "✓ Mensagem e markup salvos para a empresa."}
                      {salvamentoConfig === "erro" &&
                        "⚠ Não foi possível salvar. Altere um campo para tentar de novo."}
                    </p>
                  )}
                </div>

                <div
                  className={`calc-readout calc-readout--total mt-6 ${
                    pulseTotal ? "is-pulsing" : ""
                  }`}
                >
                  {pecasValidas.length > 0 && (
                    <div className="calc-resumo">
                      {pecasValidas.map((p) => (
                        <div key={p.id} className="calc-resumo-row">
                          <span className="calc-resumo-name">
                            {p.nome.trim() || "Peça"}
                            {quantidadePeca(p) > 1 && (
                              <i>×{quantidadePeca(p)}</i>
                            )}
                          </span>
                          <span className="calc-resumo-vals">
                            <span>
                              <em>Peça</em>
                              {brl(precoPecaItem(p, tiers))}
                            </span>
                            <span>
                              <em>Mão de obra</em>
                              {brl(maoDeObraPeca(p, valorHoraOrcamento))}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="calc-readout-breakdown">
                    <div>
                      <span className="calc-readout-k">Total de mão de obra</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={maoDeObraTotal} />
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Total peças</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={pecasTotal} />
                      </span>
                    </div>
                  </div>
                  <div className="calc-readout-main calc-readout-main--solo">
                    <span className="calc-readout-main-k">Total do orçamento</span>
                    <span className="calc-readout-num calc-readout-num--xl">
                      <AnimatedBRL value={totalOrcamento} />
                    </span>
                  </div>
                </div>

                {(copied || justSaved) && (
                  <p className="calc-saved cta-reveal mt-4">
                    {copied
                      ? "✓ Orçamento copiado."
                      : "✓ Orçamento salvo no histórico."}
                  </p>
                )}
                {erroOrcamento && (
                  <p className="calc-warn cta-reveal mt-4">
                    <span aria-hidden="true">⚠</span> {erroOrcamento}
                  </p>
                )}

                <div className="calc-actions mt-6">
                  <button
                    className="btn btn--ghost"
                    onClick={copiarOrcamento}
                  >
                    Copiar orçamento
                  </button>
                  <button className="btn btn--wa" onClick={enviarWhatsApp}>
                    Enviar no WhatsApp
                  </button>
                  <button
                    className="btn"
                    onClick={salvarOrcamento}
                    disabled={salvandoOrcamento}
                  >
                    {salvandoOrcamento ? "Salvando…" : "Salvar orçamento"}
                  </button>
                </div>

                <div className="mt-6">
                  <button className="calc-back" onClick={() => goToStep(2)}>
                    ← Voltar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ PASSO 1 (admin-only) ============
            Fica MONTADO o tempo todo (oculto por CSS fora do passo 1):
            desmontar perderia edições ainda não salvas pelo debounce e
            remontaria com o snapshot antigo do servidor. Para funcionário
            este branch simplesmente não existe — nem o chunk é carregado. */}
        {ehAdmin && (
          <div
            className={
              view === "calc" && step === 1 ? "cta-reveal" : "hidden"
            }
          >
            <Passo1
              empresaId={empresaId}
              inicial={passo1Inicial}
              onValorHora={setValorHora}
              onAvancar={() => goToStep(2)}
              onLimparResto={limparResto}
              historico={histValorHora}
              onHistoricoChange={setHistValorHora}
            />
          </div>
        )}

        {/* ============ HISTÓRICO ============ */}
        {view === "hist" && (
          <div className="cta-reveal">
            {orcamentos.length === 0 ? (
              <div className="calc-empty">
                <p className="calc-empty-num">0</p>
                <p className="calc-empty-title">Nenhum orçamento salvo ainda</p>
                <p className="calc-card-sub">
                  Monte um orçamento na calculadora e ele aparece aqui.
                </p>
                <button className="btn mt-6" onClick={novoOrcamento}>
                  Criar orçamento
                </button>
              </div>
            ) : (
              <>
                <div className={permiteVerCustoPecas ? "calc-dashboard-metricas" : ""}>
                  {permiteVerCustoPecas && (
                    <div className="calc-dashboard-cabecalho">
                      <div>
                        <span>Visão geral</span>
                        <small>Resumo dos resultados filtrados</small>
                      </div>
                    </div>
                  )}
                  <div className="calc-totais">
                    <div className="calc-totais-item calc-totais-item--pendente">
                      <span className="calc-totais-k">Total pendente</span>
                      <span className="calc-totais-v">{brl(totalPendente)}</span>
                    </div>
                    <div className="calc-totais-item calc-totais-item--aprovado">
                      <span className="calc-totais-k">Total aprovado</span>
                      <span className="calc-totais-v">{brl(totalAprovado)}</span>
                    </div>
                    <div className="calc-totais-item calc-totais-item--reprovado">
                      <span className="calc-totais-k">Total não aprovado</span>
                      <span className="calc-totais-v">{brl(totalReprovado)}</span>
                    </div>
                  </div>
                  {permiteVerCustoPecas && (
                    <div className="calc-origens">
                      <div className="calc-origens-cabecalho">
                        <span>Origem de clientes</span>
                        <small>Quantidade por canal</small>
                      </div>
                      <div className="calc-origens-grid">
                        <div>
                          <i>☎</i>
                          <span>Ligação</span>
                          <b>{saldoOrigens.ligacao}</b>
                        </div>
                        <div>
                          <i>◉</i>
                          <span>WhatsApp</span>
                          <b>{saldoOrigens.whatsapp}</b>
                        </div>
                        <div>
                          <i>●</i>
                          <span>Pessoalmente</span>
                          <b>{saldoOrigens.pessoalmente}</b>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="calc-hist-filtros">
                  <div className="calc-filtro-grupo" role="group" aria-label="Filtrar por período">
                    <button
                      type="button"
                      className={`calc-filtro-pill ${filtroPeriodo === "todos" ? "is-active" : ""}`}
                      onClick={() => setFiltroPeriodo("todos")}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className={`calc-filtro-pill ${filtroPeriodo === "semana" ? "is-active" : ""}`}
                      onClick={() => setFiltroPeriodo("semana")}
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      className={`calc-filtro-pill ${filtroPeriodo === "mes" ? "is-active" : ""}`}
                      onClick={() => setFiltroPeriodo("mes")}
                    >
                      Mês
                    </button>
                    <button
                      type="button"
                      className={`calc-filtro-pill ${filtroPeriodo === "personalizado" ? "is-active" : ""}`}
                      onClick={() => setFiltroPeriodo("personalizado")}
                    >
                      Por data
                    </button>
                  </div>
                  <select
                    className="quiz-input calc-filtro-sel"
                    value={filtroStatus}
                    onChange={(e) =>
                      setFiltroStatus(e.target.value as "" | StatusOrcamento)
                    }
                    aria-label="Filtrar por status"
                  >
                    <option value="">Todos os status</option>
                    <option value="Aguardando aprovação">
                      Aguardando aprovação
                    </option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Não aprovado">Não aprovado</option>
                  </select>
                  <input
                    type="search"
                    className="quiz-input calc-filtro-busca"
                    placeholder="Buscar por placa, cliente ou veículo…"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    aria-label="Buscar por placa, cliente ou veículo"
                  />
                </div>

                {filtroPeriodo === "personalizado" && (
                  <div className="calc-filtro-datas">
                    <label className="calc-filtro-data-campo">
                      <span>Data inicial</span>
                      <input
                        type="date"
                        className="quiz-input"
                        value={dataInicio}
                        max={dataFim || undefined}
                        onChange={(e) => setDataInicio(e.target.value)}
                      />
                    </label>
                    <label className="calc-filtro-data-campo">
                      <span>Data final</span>
                      <input
                        type="date"
                        className="quiz-input"
                        value={dataFim}
                        min={dataInicio || undefined}
                        onChange={(e) => setDataFim(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="calc-filtro-limpar"
                      onClick={() => {
                        setDataInicio("");
                        setDataFim("");
                        setFiltroPeriodo("todos");
                      }}
                    >
                      Limpar período
                    </button>
                    {intervaloInvalido && (
                      <p className="calc-filtro-data-erro" role="alert">
                        A data final deve ser igual ou posterior à data inicial.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <p className="quiz-label">
                    {orcamentosFiltrados.length}{" "}
                    {orcamentosFiltrados.length === 1
                      ? "orçamento encontrado"
                      : "orçamentos encontrados"}
                  </p>
                  <button className="btn" onClick={novoOrcamento}>
                    Novo orçamento
                  </button>
                </div>
                <div className="grid gap-3 calc-hist-lista">
                  {orcamentosFiltrados.length === 0 && (
                    <p className="calc-card-sub text-center py-8">
                      Nenhum orçamento encontrado com os filtros atuais.
                    </p>
                  )}
                  {orcamentosFiltrados.map((o) => (
                    <div
                      key={o.id}
                      className={`calc-hist ${historicoCompacto ? "calc-hist--compacto" : ""}`}
                    >
                      {historicoCompacto ? (
                        <div className="calc-hist-resumo">
                          <div
                            className="calc-hist-resumo-toggle"
                            onClick={() =>
                              setOrcamentoAbertoId((atual) =>
                                atual === o.id ? "" : o.id,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.target !== e.currentTarget) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOrcamentoAbertoId((atual) =>
                                  atual === o.id ? "" : o.id,
                                );
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={orcamentoAbertoId === o.id}
                            aria-controls={`orcamento-detalhes-${o.id}`}
                          >
                            <span className="calc-hist-main">
                            <span className="calc-hist-name">
                              <span className="calc-hist-name-text">
                                {o.nomeCliente || o.nomeCarro}
                              </span>
                              {o.placa && (
                                <>
                                  <span className="calc-hist-placa">{o.placa}</span>
                                  <button
                                    type="button"
                                    className="calc-hist-placa-copy"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copiarPlacaHistorico(o);
                                    }}
                                    aria-label={`Copiar placa ${o.placa}`}
                                    title="Copiar placa"
                                  >
                                    {placaCopiadaId === o.id
                                      ? "✓"
                                      : "Copiar"}
                                  </button>
                                </>
                              )}
                            </span>
                            <span className="calc-hist-date">
                              {o.nomeCliente ? `${o.nomeCarro} · ` : ""}
                              {formatData(o.data)}
                            </span>
                            </span>
                          </div>
                          <span className="calc-hist-resumo-meta">
                            {permiteVerCustoPecas && o.origem && (
                              <span className="calc-hist-origem-tag">
                                {o.origem}
                              </span>
                            )}
                            <select
                              className={`calc-hist-status calc-hist-status--compacto ${
                                o.status === "Aprovado"
                                  ? "calc-hist-status--aprovado"
                                  : o.status === "Não aprovado"
                                    ? "calc-hist-status--reprovado"
                                    : "calc-hist-status--pendente"
                              }`}
                              value={o.status}
                              onChange={(e) =>
                                alterarStatusOrcamento(
                                  o.id,
                                  e.target.value as StatusOrcamento,
                                )
                              }
                              disabled={atualizandoStatusId === o.id}
                              aria-label={`Status do orçamento ${o.nomeCarro}`}
                            >
                              <option value="Aguardando aprovação">Aguardando aprovação</option>
                              <option value="Aprovado">Aprovado</option>
                              <option value="Não aprovado">Não aprovado</option>
                            </select>
                            <strong
                              className={
                                o.status === "Aprovado"
                                  ? "is-aprovado"
                                  : o.status === "Não aprovado"
                                    ? "is-reprovado"
                                    : "is-pendente"
                              }
                            >
                              {brl(o.total)}
                            </strong>
                            <button
                              type="button"
                              className="calc-hist-chevron-btn"
                              onClick={() =>
                                setOrcamentoAbertoId((atual) =>
                                  atual === o.id ? "" : o.id,
                                )
                              }
                              aria-label={orcamentoAbertoId === o.id ? "Fechar detalhes" : "Abrir detalhes"}
                            >
                              <span
                                className={`calc-hist-chevron ${
                                  orcamentoAbertoId === o.id ? "is-open" : ""
                                }`}
                                aria-hidden="true"
                              >
                                ▾
                              </span>
                            </button>
                          </span>
                        </div>
                      ) : (
                        <div className="calc-hist-main">
                          <span className="calc-hist-name">
                            <span className="calc-hist-name-text">
                              {o.nomeCliente || o.nomeCarro}
                            </span>
                            {o.placa && (
                              <span className="calc-hist-placa">{o.placa}</span>
                            )}
                          </span>
                          <span className="calc-hist-date">
                            {o.nomeCliente ? `${o.nomeCarro} · ` : ""}
                            {formatData(o.data)}
                          </span>
                        </div>
                      )}
                      {(!historicoCompacto || orcamentoAbertoId === o.id) && (
                        <div
                          id={`orcamento-detalhes-${o.id}`}
                          className="calc-hist-detalhes"
                        >
                      <div className="calc-hist-vals">
                        <span className="calc-hist-valor">
                          <i>Mão de obra</i>
                          <b>{brl(o.maoDeObra ?? o.valorHora ?? 0)}</b>
                        </span>
                        <span className="calc-hist-valor">
                          <i>Peças</i>
                          <b>{brl(o.valorPeca)}</b>
                        </span>
                        <span className="calc-hist-valor calc-hist-total">
                          <i>Total do orçamento</i>
                          <b>{brl(o.total)}</b>
                        </span>
                      </div>
                      {permiteVerCustoPecas &&
                        (o.contatoCliente || o.origem) && (
                          <div className="calc-hist-cliente-extra">
                            <span>
                              <i>Contato</i>
                              <b>{o.contatoCliente || "Não informado"}</b>
                            </span>
                            <span>
                              <i>Origem</i>
                              <b>{o.origem || "Não informada"}</b>
                            </span>
                          </div>
                        )}
                      {permiteVerCustoPecas && detalheCustoId === o.id && (
                        <div className="calc-hist-custos">
                          <span className="calc-hist-custos-titulo">
                            Detalhe interno das peças
                          </span>
                          {(o.pecas ?? []).map((peca, index) => {
                            const quantidade = Math.max(
                              1,
                              Number(peca.quantidade) || 1,
                            );
                            const temCusto =
                              peca.custo != null &&
                              Number.isFinite(Number(peca.custo));
                            const custoTotal = temCusto
                              ? Number(peca.custo) * quantidade
                              : null;
                            return (
                              <div
                                className="calc-hist-custo-item"
                                key={`${o.id}-${index}`}
                              >
                                <div>
                                  <b>{peca.nome || "Peça"}</b>
                                  <small>Qtd. {quantidade}</small>
                                </div>
                                <span>
                                  <i>Custo sem markup</i>
                                  <b>
                                    {custoTotal != null
                                      ? brl(custoTotal)
                                      : "Não registrado"}
                                  </b>
                                </span>
                                <span>
                                  <i>Markup aplicado</i>
                                  <b>
                                    {peca.markup != null
                                      ? `${peca.markup}%`
                                      : "Não registrado"}
                                  </b>
                                </span>
                                <strong>
                                  <i>Valor final</i>
                                  <b>{brl(Number(peca.valor) || 0)}</b>
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className={`calc-hist-controls ${historicoCompacto ? "is-compacto" : ""}`}>
                        {!historicoCompacto && <select
                          className={`calc-hist-status ${
                            o.status === "Aprovado"
                              ? "calc-hist-status--aprovado"
                              : o.status === "Não aprovado"
                                ? "calc-hist-status--reprovado"
                                : "calc-hist-status--pendente"
                          }`}
                          value={o.status}
                          onChange={(e) =>
                            alterarStatusOrcamento(
                              o.id,
                              e.target.value as StatusOrcamento,
                            )
                          }
                          disabled={atualizandoStatusId === o.id}
                          aria-label={`Status do orçamento ${o.nomeCarro}`}
                        >
                          <option value="Aguardando aprovação">
                            Aguardando aprovação
                          </option>
                          <option value="Aprovado">Aprovado</option>
                          <option value="Não aprovado">Não aprovado</option>
                        </select>}
                        <div className="calc-hist-actions">
                          {permiteVerCustoPecas && (
                            <button
                              type="button"
                              className="calc-hist-wa calc-hist-detail"
                              onClick={() =>
                                setDetalheCustoId((atual) =>
                                  atual === o.id ? "" : o.id,
                                )
                              }
                              aria-expanded={detalheCustoId === o.id}
                            >
                              {detalheCustoId === o.id
                                ? "Fechar detalhe"
                                : "Detalhe"}
                            </button>
                          )}
                          <button
                            className="calc-hist-wa calc-hist-copy"
                            onClick={() => copiarOrcamentoHistorico(o)}
                            aria-label={`Copiar orçamento ${o.nomeCarro}`}
                          >
                            {copiadoId === o.id ? "✓ Copiado" : "Copiar"}
                          </button>
                          <button
                            className="calc-hist-wa"
                            onClick={() => reenviarWhatsApp(o)}
                            aria-label={`Enviar orçamento ${o.nomeCarro} no WhatsApp`}
                          >
                            WhatsApp
                          </button>
                          {permiteEditarOrcamentos && (
                            <button
                              className="calc-hist-wa calc-hist-edit"
                              onClick={() => abrirEdicaoOrcamento(o)}
                              aria-label={`Editar orçamento ${o.nomeCarro}`}
                            >
                              Editar
                            </button>
                          )}
                          <button
                            className="calc-hist-del"
                            onClick={() => removerOrcamento(o.id)}
                            aria-label={`Remover orçamento ${o.nomeCarro}`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="calc-card mt-8">
                  <p className="calc-card-kicker">Relatório</p>
                  <h2 className="calc-card-title">Exportar histórico em XLSX</h2>
                  <p className="calc-card-sub">
                    Gera uma planilha com os orçamentos do período escolhido.
                    Deixe as datas em branco para exportar tudo.
                  </p>
                  <div className="calc-grid-2 mt-5">
                    <label className="grid gap-1.5">
                      <span className="quiz-label">De</span>
                      <input
                        type="date"
                        className="quiz-input"
                        value={expInicio}
                        onChange={(e) => setExpInicio(e.target.value)}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="quiz-label">Até</span>
                      <input
                        type="date"
                        className="quiz-input"
                        value={expFim}
                        onChange={(e) => setExpFim(e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="btn btn--wide mt-5"
                    onClick={exportarXlsx}
                    disabled={exportando}
                  >
                    {exportando ? "Gerando…" : "Exportar XLSX"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {ajusteRapido && (
          <div
            className="calc-ajuste-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !salvandoAjuste) {
                setAjusteRapido(null);
              }
            }}
          >
            <div
              className="calc-ajuste-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="calc-ajuste-titulo"
            >
              <div className="calc-ajuste-cabecalho">
                <div>
                  <p className="calc-card-kicker">Ajuste rápido</p>
                  <h2 id="calc-ajuste-titulo" className="calc-card-title">
                    Editar orçamento
                  </h2>
                </div>
                <button
                  type="button"
                  className="calc-ajuste-fechar"
                  onClick={() => setAjusteRapido(null)}
                  disabled={salvandoAjuste}
                  aria-label="Fechar ajuste rápido"
                >
                  ×
                </button>
              </div>

              <div className="calc-grid-2 mt-5">
                <label className="grid gap-1.5">
                  <span className="quiz-label">Cliente</span>
                  <input
                    className="quiz-input"
                    value={ajusteRapido.nomeCliente}
                    onChange={(e) =>
                      atualizarAjusteRapido("nomeCliente", e.target.value)
                    }
                  />
                </label>
                {permiteVerCustoPecas && (
                  <>
                    <label className="grid gap-1.5">
                      <span className="quiz-label">Contato</span>
                      <input
                        type="tel"
                        className="quiz-input"
                        value={ajusteRapido.contatoCliente}
                        maxLength={30}
                        onChange={(e) =>
                          atualizarAjusteRapido(
                            "contatoCliente",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="quiz-label">Origem</span>
                      <select
                        className="quiz-input"
                        value={ajusteRapido.origem}
                        onChange={(e) =>
                          atualizarAjusteRapido("origem", e.target.value)
                        }
                      >
                        <option value="">Selecione a origem</option>
                        <option value="Ligação">Ligação</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Pessoalmente">Pessoalmente</option>
                      </select>
                    </label>
                  </>
                )}
                <label className="grid gap-1.5">
                  <span className="quiz-label">Veículo</span>
                  <input
                    className="quiz-input"
                    value={ajusteRapido.nomeCarro}
                    onChange={(e) =>
                      atualizarAjusteRapido("nomeCarro", e.target.value)
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="quiz-label">Placa</span>
                  <input
                    className="quiz-input"
                    value={ajusteRapido.placa}
                    maxLength={8}
                    onChange={(e) =>
                      atualizarAjusteRapido(
                        "placa",
                        e.target.value.toUpperCase(),
                      )
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="quiz-label">
                    Valor da hora <span className="calc-lock-tag">🔒 base fixa</span>
                  </span>
                  <span className="calc-money calc-money--locked">
                    <span className="calc-money-prefix">R$</span>
                    <input
                      readOnly
                      value={ajusteRapido.valorHora.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    />
                  </span>
                </label>
              </div>

              <div className="calc-divider" />
              <div className="calc-ajuste-itens-titulo">
                <span className="quiz-label">Itens do orçamento</span>
                <button type="button" onClick={adicionarPecaAjuste}>
                  + Adicionar item
                </button>
              </div>

              <div className="calc-ajuste-itens">
                {ajusteRapido.pecas.length === 0 && (
                  <p className="calc-card-sub text-center py-5">
                    Nenhum item. Adicione uma peça para continuar.
                  </p>
                )}
                {ajusteRapido.pecas.map((peca) => (
                  <div className="calc-ajuste-item" key={peca.id}>
                    <label>
                      <span>Descrição</span>
                      <input
                        className="quiz-input"
                        value={peca.nome}
                        onChange={(e) =>
                          atualizarPecaAjuste(
                            peca.id,
                            "nome",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Qtd.</span>
                      <input
                        className="quiz-input"
                        inputMode="numeric"
                        value={peca.quantidade}
                        onChange={(e) =>
                          atualizarPecaAjuste(
                            peca.id,
                            "quantidade",
                            maskIntTyping(e.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Custo unitário (R$)</span>
                      <input
                        className="quiz-input"
                        inputMode="decimal"
                        value={peca.custo}
                        onChange={(e) =>
                          atualizarPecaAjuste(
                            peca.id,
                            "custo",
                            maskMoneyTyping(e.target.value),
                          )
                        }
                        onBlur={(e) =>
                          atualizarPecaAjuste(
                            peca.id,
                            "custo",
                            formatMoneyBlur(e.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Markup</span>
                      <span className="calc-ajuste-markup">
                        <input
                          className="quiz-input"
                          inputMode="numeric"
                          value={String(
                            peca.markup ??
                              tierForCost(parseNum(peca.custo), tiers).markup,
                          )}
                          onChange={(e) =>
                            atualizarPecaAjuste(
                              peca.id,
                              "markup",
                              Math.max(
                                MARKUP_MIN,
                                Math.min(
                                  MARKUP_MAX,
                                  Number(e.target.value.replace(/\D/g, "")) || 0,
                                ),
                              ),
                            )
                          }
                        />
                        <span>%</span>
                      </span>
                    </label>
                    <label>
                      <span>Horas</span>
                      <input
                        className="quiz-input"
                        inputMode="decimal"
                        value={peca.horas}
                        onChange={(e) =>
                          atualizarPecaAjuste(
                            peca.id,
                            "horas",
                            maskMoneyTyping(e.target.value),
                          )
                        }
                      />
                    </label>
                    <div className="calc-ajuste-item-mao">
                      <span>Preço da peça</span>
                      <b>
                        {brl(valorPecaAjuste(peca, tiers))}
                      </b>
                    </div>
                    <button
                      type="button"
                      className="calc-ajuste-item-excluir"
                      onClick={() => excluirPecaAjuste(peca.id)}
                      aria-label={`Excluir item ${peca.nome || "sem nome"}`}
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>

              {ajusteRapido.pecas.length > 0 && (
                <div className="calc-ajuste-detalhes">
                  <span className="quiz-label">Detalhamento do orçamento</span>
                  {ajusteRapido.pecas.map((peca) => {
                    const valorPecas = valorPecaAjuste(peca, tiers);
                    const horas = parseNum(peca.horas);
                    const maoDeObra = horas * ajusteRapido.valorHora;
                    return (
                      <div className="calc-ajuste-detalhe" key={peca.id}>
                        <div>
                          <b>{peca.nome.trim() || "Peça"}</b>
                          <small>
                            Qtd. {Math.max(1, parseNum(peca.quantidade))} ·{" "}
                            {horas.toLocaleString("pt-BR", {
                              maximumFractionDigits: 2,
                            })}h
                          </small>
                        </div>
                        <span>Peças <b>{brl(valorPecas)}</b></span>
                        <span>Mão de obra <b>{brl(maoDeObra)}</b></span>
                        <strong>{brl(valorPecas + maoDeObra)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="calc-ajuste-totais">
                <span>Peças <b>{brl(totaisAjusteRapido.pecas)}</b></span>
                <span>Mão de obra <b>{brl(totaisAjusteRapido.maoDeObra)}</b></span>
                <span>Total <strong>{brl(totaisAjusteRapido.total)}</strong></span>
              </div>

              {erroAjuste && (
                <p className="calc-warn mt-4" role="alert">
                  <span aria-hidden="true">⚠</span> {erroAjuste}
                </p>
              )}

              <div className="calc-ajuste-acoes">
                <button
                  type="button"
                  className="calc-ajuste-excluir"
                  onClick={excluirOrcamentoDoAjuste}
                  disabled={salvandoAjuste}
                >
                  Excluir orçamento
                </button>
                <div>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setAjusteRapido(null)}
                    disabled={salvandoAjuste}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={salvarAjusteRapido}
                    disabled={salvandoAjuste}
                  >
                    {salvandoAjuste ? "Salvando…" : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {dialogConfirmacao}
      </div>
    </section>
  );
}
