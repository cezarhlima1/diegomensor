import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Calculadora from "@/components/calculadora/Calculadora";
import Footer from "@/components/Footer";
import HeaderLogado from "@/components/auth/HeaderLogado";
import { getSessaoComEmpresa } from "@/lib/auth/sessao";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Orcamento,
  PecaResumo,
  Passo1Dados,
  Passo2ConfigDados,
  StatusOrcamento,
  StatusValorHora,
  ValorHoraSalvo,
} from "@/components/calculadora/calcLogic";

export const metadata: Metadata = {
  title: "Calculadora de Precificação - Diego Mensor",
  description:
    "Calcule o custo real da sua hora, precifique peças com o markup certo e monte orçamentos para a sua oficina. Histórico compartilhado com a equipe.",
};

// Página por trás de login: nunca pode ser pré-renderizada. Sem isto, o
// build sem env do Supabase tentaria prerender e falharia na checagem de env
// (que roda antes de cookies() marcar a rota como dinâmica).
export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  // Defesa em profundidade: o middleware já bloqueia sem sessão, mas a
  // página revalida (cobre também usuário autenticado sem empresa).
  const sessao = await getSessaoComEmpresa();
  if (!sessao) redirect("/login");

  // Insumos do Passo 1: consultados e serializados APENAS para admin — para
  // funcionário nem a query acontece, então os dados nunca saem do servidor
  // (DW-4.1). Leitura via client RLS (policy "select apenas admin da
  // empresa"): menor privilégio — o service role fica só na escrita
  // (salvarPasso1).
  let passo1Inicial: Passo1Dados | undefined;
  if (sessao.empresaAtiva.papel === "admin") {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("calc_passo1")
      .select("custos, horas_mes, mecanicos, multiplicador")
      .eq("empresa_id", sessao.empresaAtiva.id)
      .maybeSingle();
    if (error) {
      // Falha ALTO: renderizar o Passo 1 vazio quando há dados no banco
      // deixaria o admin sobrescrever os custos reais com um form vazio.
      throw new Error(
        `calculadora: falha ao carregar calc_passo1: ${error.message}`
      );
    }
    if (data) {
      passo1Inicial = {
        custos: (data.custos ?? {}) as Record<string, string>,
        horasMes: data.horas_mes ?? "",
        mecanicos: data.mecanicos ?? "",
        multiplicador: Number(data.multiplicador),
      };
    }
  }

  // Configuração dos Passos 2-3 (markup por faixa, sufixo do orçamento):
  // legível por QUALQUER membro (RLS "calc_config: select se membro") — ao
  // contrário de calc_passo1, não é gate por papel.
  let passo2ConfigInicial: Passo2ConfigDados | undefined;
  {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("calc_config")
      .select("markup_tiers, sufixo_orcamento")
      .eq("empresa_id", sessao.empresaAtiva.id)
      .maybeSingle();
    if (error) {
      throw new Error(
        `calculadora: falha ao carregar calc_config: ${error.message}`
      );
    }
    if (data) {
      passo2ConfigInicial = {
        markupTiers: (data.markup_tiers ?? []) as number[],
        sufixoOrcamento: data.sufixo_orcamento ?? "",
      };
    }
  }

  // Histórico de orçamentos: legível por QUALQUER membro (RLS "orcamentos:
  // select se membro") — admin e funcionário veem e acompanham o mesmo
  // histórico compartilhado da empresa, incluindo o status de aprovação.
  let orcamentosIniciais: Orcamento[] = [];
  {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("orcamentos")
      .select(
        "id, nome_cliente, nome_carro, placa, valor_hora, horas, mao_de_obra, pecas, valor_peca, total, status, created_at"
      )
      .eq("empresa_id", sessao.empresaAtiva.id)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(
        `calculadora: falha ao carregar orcamentos: ${error.message}`
      );
    }
    orcamentosIniciais = (data ?? []).map((o) => ({
      id: o.id,
      nomeCliente: o.nome_cliente,
      nomeCarro: o.nome_carro,
      placa: o.placa,
      valorHora: Number(o.valor_hora),
      horas: Number(o.horas),
      maoDeObra: Number(o.mao_de_obra),
      pecas: (o.pecas ?? []) as PecaResumo[],
      valorPeca: Number(o.valor_peca),
      total: Number(o.total),
      status: o.status as StatusOrcamento,
      data: o.created_at,
    }));
  }

  // Histórico de valores hora: legível por QUALQUER membro (RLS "select se
  // membro") — o funcionário também seleciona o valor no orçamento; a
  // ESCRITA continua restrita a admin (server actions do Passo 1).
  let valorHoraHistoricoInicial: ValorHoraSalvo[] = [];
  {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("valor_hora_historico")
      .select("id, nome, valor_hora, status, created_at")
      .eq("empresa_id", sessao.empresaAtiva.id)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(
        `calculadora: falha ao carregar valor_hora_historico: ${error.message}`
      );
    }
    valorHoraHistoricoInicial = (data ?? []).map((h) => ({
      id: h.id,
      nome: h.nome,
      valorHora: Number(h.valor_hora),
      status: h.status as StatusValorHora,
      data: h.created_at,
    }));
  }

  return (
    <>
      <HeaderLogado nomeEmpresa={sessao.empresaAtiva.nome}>
        {/* Gestão de conta é exclusiva de admin — funcionário nem vê o link
            (e a página /conta revalida o papel no servidor de toda forma). */}
        {sessao.empresaAtiva.papel === "admin" && (
          <Link href="/conta" className="auth-nav-link">
            Minha conta
          </Link>
        )}
      </HeaderLogado>
      <main>
        {/* key = empresa ativa: trocar de empresa remonta o client component
            (estado, Passo 1 e namespace do localStorage zerados p/ a nova). */}
        <Calculadora
          key={sessao.empresaAtiva.id}
          papel={sessao.empresaAtiva.papel}
          empresaId={sessao.empresaAtiva.id}
          valorHoraInicial={sessao.empresaAtiva.valorHora}
          passo1Inicial={passo1Inicial}
          passo2ConfigInicial={passo2ConfigInicial}
          orcamentosIniciais={orcamentosIniciais}
          valorHoraHistoricoInicial={valorHoraHistoricoInicial}
          nomeEmpresa={sessao.empresaAtiva.nome}
        />
      </main>
      <Footer />
    </>
  );
}
