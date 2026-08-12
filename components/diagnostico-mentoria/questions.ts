export type Question = {
  id: string; label: string; type?: "text" | "textarea" | "number" | "money" | "radio" | "checkbox" | "scale";
  options?: string[]; hint?: string; placeholder?: string; optional?: boolean;
};

export type Section = { icon: string; title: string; subtitle: string; questions: Question[] };
const radio = (id: string, label: string, options: string[]): Question => ({ id, label, type: "radio", options });
const text = (id: string, label: string, placeholder = "Digite sua resposta..."): Question => ({ id, label, placeholder });
const area = (id: string, label: string, hint?: string): Question => ({ id, label, type: "textarea", hint, placeholder: "Conte com suas palavras..." });

export const sections: Section[] = [
  { icon: "01", title: "Raio-X da oficina", subtitle: "Vamos começar conhecendo sua estrutura e quem faz a operação acontecer.", questions: [
    text("nome", "Seu nome completo", "Como você gosta de ser chamado?"), text("oficina", "Nome da oficina"), text("cidade", "Cidade e estado", "Ex.: Caxias do Sul / RS"), text("tempoOficina", "Há quanto tempo a oficina existe?"), text("tempoFrente", "Há quanto tempo você está à frente da oficina?"),
    { id: "tipo", label: "Qual é o tipo de oficina?", type: "checkbox", options: ["Mecânica geral", "Especializada", "Funilaria e pintura", "Elétrica", "Centro automotivo", "Outra"] },
    { id: "veiculosMes", label: "Quantos veículos, em média, passam pela oficina por mês?", type: "number", placeholder: "Ex.: 80" },
    { id: "pessoas", label: "Quantas pessoas trabalham na operação, incluindo você?", type: "number", placeholder: "Ex.: 6" },
    area("equipeFuncoes", "Liste cada pessoa da equipe e a função que ela exerce hoje.", "Ex.: João — mecânico · Maria — recepção e financeiro"),
    area("lideranca", "Existe alguém além de você em posição de liderança ou gestão?", "Diga quem é e qual responsabilidade essa pessoa assume. Se não houver, escreva “não”."),
  ]},
  { icon: "02", title: "Dinheiro", subtitle: "Uma fotografia financeira sincera ajuda a aproveitar muito melhor nossa primeira sessão.", questions: [
    { id: "faturamento3", label: "Qual foi o faturamento bruto da oficina nos últimos 3 meses?", type: "textarea", placeholder: "Mês 1: R$\nMês 2: R$\nMês 3: R$" },
    { id: "lucro3", label: "Qual foi aproximadamente o lucro líquido nesses mesmos meses?", type: "textarea", hint: "Se você não souber, tudo bem — escreva “não sei”. Isso também é informação importante.", placeholder: "Mês 1: R$\nMês 2: R$\nMês 3: R$" },
    { id: "custoFixo", label: "Qual é o custo fixo mensal aproximado?", type: "money", placeholder: "R$ 0,00" },
    radio("margem", "Você sabe hoje qual é a margem de lucro da oficina?", ["Sim, sei exatamente", "Tenho uma ideia", "Não sei"]),
    { id: "margemValor", label: "Se souber, qual é a margem?", placeholder: "Ex.: 18%", optional: true },
    { id: "ticket", label: "Qual é o ticket médio atual?", type: "money", placeholder: "R$ 0,00", optional: true, hint: "Se não souber, pode deixar em branco." },
    { id: "horaTecnica", label: "Qual é o valor atual da sua hora técnica?", type: "money", placeholder: "R$ 0,00", optional: true },
    area("precoMaoObra", "Como você define o preço da mão de obra hoje?"), area("precoPecas", "Como você precifica as peças?"),
    radio("custoHoraMecanico", "Você sabe quanto custa uma hora produtiva de cada mecânico?", ["Sim", "Mais ou menos", "Não"]),
    radio("produtividade", "Você acompanha a produtividade individual dos mecânicos?", ["Sim, com indicadores", "Acompanho informalmente", "Não"]),
    radio("lucroServicos", "Você sabe quais serviços dão mais e menos lucro?", ["Sim", "Parcialmente", "Não"]),
    { id: "numeros", label: "Quais números você acompanha atualmente?", type: "checkbox", options: ["Faturamento", "Lucro", "Margem", "Ticket médio", "Quantidade de veículos", "Horas vendidas", "Produtividade por mecânico", "Conversão de orçamento", "Retorno de clientes", "Custos", "Nenhum", "Outros"] },
    area("maiorProblemaFinanceiro", "Qual é hoje o maior problema financeiro da oficina?"),
  ]},
  { icon: "03", title: "Operação e processos", subtitle: "Agora quero enxergar como o trabalho realmente flui no dia a dia.", questions: [
    area("operacaoReal", "Descreva o passo a passo REAL da operação, da chegada do cliente ao pós-venda.", "Pode colocar a realidade como ela é hoje: recepção → cadastro → O.S. → diagnóstico → orçamento → execução → entrega..."),
    { id: "processos", label: "Quais processos já estão definidos e padronizados?", type: "checkbox", options: ["Recepção", "Cadastro do cliente", "Abertura de OS", "Check-in", "Distribuição de serviço", "Diagnóstico", "Checklist", "Orçamento", "Aprovação", "Compra de peças", "Execução", "Teste final", "Check-out", "Entrega", "Caixa", "Pós-venda", "Nenhum está realmente padronizado"] },
    radio("documentacao", "Esses processos estão documentados ou apenas na cabeça das pessoas?", ["Documentados e utilizados", "Alguns documentados", "Existem, mas não estão escritos", "Não temos processos definidos"]),
    area("erros", "Onde mais acontecem erros, atrasos ou retrabalho hoje?"), area("semVoce", "O que costuma dar problema quando você não está na oficina?"), area("decisoes", "Quais decisões ainda precisam passar obrigatoriamente por você?"),
    radio("seteDias", "Se você ficar 7 dias sem ir à oficina, o que acredita que aconteceria?", ["Funcionaria normalmente", "Funcionaria, mas alguns problemas apareceriam", "Teriam muitos problemas", "Provavelmente viraria um caos", "Não consigo imaginar ficar 7 dias fora"]),
  ]},
  { icon: "04", title: "Equipe", subtitle: "Pessoas certas, responsabilidades claras e uma equipe que evolui junto.", questions: [
    radio("pessoasCertas", "Você considera que tem as pessoas certas nas funções certas?", ["Sim", "Parcialmente", "Não", "Não sei"]), area("problemaEquipe", "Qual é hoje o maior problema relacionado à equipe?"),
    radio("responsabilidades", "Existe clareza sobre a responsabilidade de cada pessoa?", ["Sim", "Parcialmente", "Não"]), radio("metas", "A equipe possui metas ou indicadores individuais?", ["Sim", "Alguns", "Não"]),
    radio("reunioes", "Você realiza reuniões com a equipe?", ["Semanalmente", "Quinzenalmente", "Mensalmente", "Quando surge algum problema", "Não realizo"]),
    { id: "notaEquipe", label: "Como você avalia sua equipe hoje?", type: "scale" }, area("equipe10", "O que precisaria mudar para essa equipe virar uma equipe 10?"), area("contratar", "Hoje você precisa contratar alguém?", "Se sim, diga para qual função e por quê. Se não, escreva “não”."),
  ]},
  { icon: "05", title: "O dono", subtitle: "Esta parte é sobre sua rotina, suas decisões e o espaço que a oficina ocupa na sua vida.", questions: [
    area("funcaoDono", "Qual é sua função REAL dentro da oficina no dia a dia?", "Não o cargo: conte o que você realmente faz."), { id: "horasDia", label: "Quantas horas por dia você trabalha, em média?", type: "number", placeholder: "Ex.: 10" },
    radio("tempoOperacional", "Quanto do seu tempo ainda está no operacional?", ["Até 20%", "20–40%", "40–60%", "60–80%", "Mais de 80%"]), area("delegarAtividades", "O que você continua fazendo e sabe que já deveria ter delegado?"),
    { id: "impedeDelegar", label: "O que mais te impede de delegar hoje?", type: "checkbox", options: ["Não tenho para quem delegar", "Não confio que façam corretamente", "Não tenho processos", "Não tenho tempo para ensinar", "Tenho dificuldade de cobrar", "Prefiro fazer eu mesmo", "Nunca parei para organizar isso", "Outro"] },
    area("desgastante", "Qual é a parte mais desgastante de ser dono da sua oficina?"), area("decisaoAdiada", "Qual decisão você sabe que precisa tomar, mas vem adiando?"), area("mudarDono", "O que VOCÊ precisa mudar para a oficina chegar ao próximo nível?"),
    { id: "notaDono", label: "Quanto você se sente DONO da empresa, em vez de funcionário dela?", type: "scale" }, area("porqueNota", "Por que você deu essa nota?"),
  ]},
  { icon: "06", title: "Problemas e prioridades", subtitle: "Vamos separar o que faz barulho daquilo que realmente precisa ser resolvido primeiro.", questions: [
    area("tresProblemas", "Quais são hoje os 3 maiores problemas da sua oficina?", "Liste do mais urgente para o menos urgente."), area("umProblema", "Se pudesse resolver APENAS UM nos próximos 30 dias, qual escolheria?"), area("porqueAgora", "Por que esse problema precisa ser resolvido agora?"), text("tempoProblema", "Há quanto tempo esse problema existe?"), area("tentou", "O que você já tentou fazer para resolver?"), area("porqueNaoResolveu", "Por que acredita que ainda não conseguiu resolver?"),
  ]},
  { icon: "07", title: "Onde você quer chegar", subtitle: "Agora olhamos para frente: números, liberdade e a oficina que você quer construir.", questions: [
    { id: "metaFaturamento", label: "Onde você quer chegar em faturamento mensal?", type: "money", placeholder: "R$ 0,00" }, text("prazoMeta", "Em quanto tempo gostaria de chegar nesse faturamento?"), { id: "metaLucro", label: "Quanto gostaria que sobrasse de LUCRO todos os meses?", type: "money", placeholder: "R$ 0,00" },
    { id: "conquistas", label: "Além de dinheiro, o que quer conquistar? Selecione até 3.", type: "checkbox", options: ["Trabalhar menos horas", "Sair do operacional", "Ter mais tempo com a família", "Viajar sem preocupação", "Ter uma equipe que funcione sem mim", "Ter mais tranquilidade", "Não levar problemas para casa", "Crescer/expandir a empresa", "Abrir outra unidade", "Melhorar minha qualidade de vida", "Me sentir mais seguro como empresário", "Outro"] },
    area("oficinaIdeal", "Daqui a 12 meses, como seria a oficina ideal para você?"), area("vidaIdeal", "E como seria a SUA VIDA se a oficina funcionasse dessa forma?"),
  ]},
  { icon: "08", title: "Comprometimento", subtitle: "Última etapa. Queremos alinhar energia, disponibilidade e o que fará esta jornada valer a pena.", questions: [
    { id: "comprometimento", label: "Qual é seu nível de comprometimento em implementar mudanças?", type: "scale" }, { id: "horasSemana", label: "Quantas horas por semana consegue separar para implementar o que for definido?", type: "number", placeholder: "Ex.: 4" }, area("naoDisposto", "Existe alguma mudança que você NÃO está disposto a fazer hoje?", "Se não houver, escreva “não”."), area("valeuPena", "O que precisa acontecer para você dizer: “essa mentoria valeu a pena”?"),
  ]},
];

export const allQuestions = sections.flatMap((section) => section.questions);
