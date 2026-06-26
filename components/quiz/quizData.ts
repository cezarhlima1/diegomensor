/* ============================================================
   DADOS DO QUIZ (placeholder)
   ------------------------------------------------------------
   Estrutura pensada para você trocar facilmente depois:
   - `results`: os cursos que podem ser recomendados.
   - `questions`: cada opção dá "pontos" para um ou mais cursos.
   No fim, o curso com mais pontos é o recomendado (empate -> o de menor índice).
   Basta editar os textos e os pesos (`scores`) quando tiver o conteúdo real.
   ============================================================ */

export type ResultId = "fundamentos" | "margem" | "escala";

export type QuizResult = {
  id: ResultId;
  /** etiqueta curta exibida no topo do resultado */
  kicker: string;
  /** nome do curso recomendado */
  course: string;
  /** frase de efeito */
  tagline: string;
  /** parágrafo explicando por que esse curso faz sentido */
  description: string;
  /** bullets do que a pessoa vai resolver */
  highlights: string[];
  /** texto do botão */
  cta: string;
};

export type QuizOption = {
  label: string;
  /** quanto essa resposta soma para cada curso */
  scores: Partial<Record<ResultId, number>>;
  /**
   * Sinal de alerta que esta resposta revela. Só as respostas que indicam um
   * problema têm `signal`; a resposta "forte" (a primeira de cada pergunta) fica
   * sem sinal. O diagnóstico final é montado juntando os sinais escolhidos.
   */
  signal?: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
};

/* ------------------------------------------------------------
   RESULTADOS / CURSOS
   ------------------------------------------------------------ */
export const results: QuizResult[] = [
  {
    id: "fundamentos",
    kicker: "Seu ponto de partida",
    course: "Fundamentos da Precificação",
    tagline: "Pare de chutar preço e descubra seus números reais.",
    description:
      "Você ainda decide preço no feeling ou copiando o concorrente, e isso te deixa exposto. O primeiro passo é enxergar quanto a sua oficina realmente custa antes de pensar em quanto cobrar.",
    highlights: [
      "Descubra o custo real da hora de trabalho",
      "Monte uma base de preço que não depende de achismo",
      "Saiba exatamente onde você está perdendo dinheiro",
    ],
    cta: "Quero aprender a precificar",
  },
  {
    id: "margem",
    kicker: "Seu maior gargalo",
    course: "Margem & Lucro na Oficina",
    tagline: "Você fatura, mas no fim do mês some. Vamos arrumar isso.",
    description:
      "Você já tem preço definido, mas o dinheiro não sobra como deveria. O foco aqui é margem: ajustar o que você cobra para que cada serviço entregue lucro de verdade, sem perder cliente.",
    highlights: [
      "Calcule a margem certa por tipo de serviço",
      "Identifique os serviços que dão prejuízo escondido",
      "Reajuste preços com segurança e argumento",
    ],
    cta: "Quero aprender a precificar",
  },
  {
    id: "escala",
    kicker: "Seu próximo nível",
    course: "Gestão & Escala",
    tagline: "Sua oficina roda, agora é hora de crescer com controle.",
    description:
      "Você já tem estrutura e equipe, mas crescer sem método vira caos. O foco é gestão: previsibilidade, indicadores e processos para escalar faturamento sem que tudo dependa de você.",
    highlights: [
      "Painel de indicadores para decidir com dados",
      "Precificação padronizada para a equipe inteira",
      "Processos que sustentam o crescimento",
    ],
    cta: "Quero aprender a precificar",
  },
];

/* ------------------------------------------------------------
   PERGUNTAS (placeholder — substitua pelas reais depois)
   ------------------------------------------------------------ */
export const questions: QuizQuestion[] = [
  {
    id: "fim-do-mes",
    question: "No fim do mês, qual cenário é mais comum na sua oficina?",
    options: [
      { label: "Sei exatamente quanto entrou e quanto sobrou.", scores: { escala: 2 } },
      { label: "Geralmente sobra dinheiro, mas sem muita previsibilidade.", scores: { margem: 2, escala: 1 }, signal: "Falta previsibilidade: você não sabe de onde vem (nem para onde vai) o lucro." },
      { label: "O movimento existe, mas sobra menos do que eu esperava.", scores: { fundamentos: 1, margem: 1 }, signal: "O movimento existe, mas no fim do mês sobra menos do que deveria." },
      { label: "Trabalho muito e, no final, parece que o dinheiro desaparece.", scores: { fundamentos: 2 }, signal: "Você trabalha muito e, mesmo assim, o dinheiro some no fim do mês." },
    ],
  },
  {
    id: "mao-de-obra",
    question: "Hoje, como você define o valor da mão de obra na sua oficina?",
    options: [
      { label: "Tenho um cálculo baseado nos custos da operação.", scores: { escala: 2 } },
      { label: "Uso um cálculo, mas faço ajustes pela experiência.", scores: { margem: 2, escala: 1 }, signal: "Você calcula a mão de obra, mas ajusta no feeling — e aí abre brecha para erro." },
      { label: "Me baseio principalmente no mercado e na concorrência.", scores: { fundamentos: 1, margem: 1 }, signal: "Você precifica a mão de obra olhando o concorrente, não o seu custo real." },
      { label: "Vou definindo conforme cada situação.", scores: { fundamentos: 2 }, signal: "Você define a mão de obra conforme a situação, sem um cálculo por trás." },
    ],
  },
  {
    id: "venda-peca",
    question: "Quando você vende uma peça para o cliente:",
    options: [
      { label: "Tenho uma margem definida e sigo um padrão.", scores: { escala: 2 } },
      { label: "Normalmente aplico uma margem parecida.", scores: { margem: 2, escala: 1 }, signal: "Sua margem na venda de peças varia — nem sempre o lucro está garantido." },
      { label: "Depende muito do cliente e da situação.", scores: { fundamentos: 1, margem: 1 }, signal: "A margem da peça depende do cliente, então o lucro fica imprevisível." },
      { label: "Muitas vezes repasso praticamente o preço que paguei.", scores: { fundamentos: 2 }, signal: "Você repassa a peça quase pelo preço que pagou — praticamente sem lucro." },
    ],
  },
  {
    id: "orcamento-questionado",
    question: "Quando o cliente questiona o valor do orçamento, você costuma:",
    options: [
      { label: "Explicar com segurança como o preço foi definido.", scores: { escala: 2 } },
      { label: "Defender o orçamento, mas fico desconfortável.", scores: { margem: 2, escala: 1 }, signal: "Você defende o orçamento, mas sem segurança total no próprio preço." },
      { label: "Negociar para não perder o serviço.", scores: { fundamentos: 1, margem: 1 }, signal: "Você negocia para não perder o serviço — e perde margem nisso." },
      { label: "Reduzir o valor na maioria das vezes.", scores: { fundamentos: 2 }, signal: "Você reduz o valor na maioria das vezes em que é questionado." },
    ],
  },
  {
    id: "trabalho-demais",
    question: "Com que frequência você sente que trabalhou demais pelo valor que recebeu?",
    options: [
      { label: "Quase nunca.", scores: { escala: 2 } },
      { label: "Às vezes.", scores: { margem: 2, escala: 1 }, signal: "Às vezes você sente que trabalhou demais para o valor que recebeu." },
      { label: "Frequentemente.", scores: { fundamentos: 1, margem: 1 }, signal: "Com frequência o esforço não corresponde ao valor que entra." },
      { label: "Quase todos os dias.", scores: { fundamentos: 2 }, signal: "Quase todo dia você sente que trabalhou demais pelo pouco que recebeu." },
    ],
  },
  {
    id: "custo-oficina",
    question: "Você sabe quanto custa manter a oficina aberta por mês?",
    options: [
      { label: "Sim, sei exatamente.", scores: { escala: 2 } },
      { label: "Tenho uma boa noção.", scores: { margem: 2, escala: 1 }, signal: "Você tem boa noção do custo da oficina, mas não o número exato." },
      { label: "Tenho apenas uma ideia aproximada.", scores: { fundamentos: 1, margem: 1 }, signal: "Você só tem uma ideia aproximada de quanto custa manter a oficina." },
      { label: "Não faço esse cálculo.", scores: { fundamentos: 2 }, signal: "Você não calcula quanto custa manter a oficina aberta por mês." },
    ],
  },
];

/* ------------------------------------------------------------
   PONTUAÇÃO
   Recebe os índices das opções escolhidas (por pergunta) e
   devolve o curso vencedor.
   ------------------------------------------------------------ */
export function scoreQuiz(answers: number[]): QuizResult {
  const totals: Record<ResultId, number> = { fundamentos: 0, margem: 0, escala: 0 };

  answers.forEach((optionIndex, questionIndex) => {
    const option = questions[questionIndex]?.options[optionIndex];
    if (!option) return;
    for (const [resultId, points] of Object.entries(option.scores)) {
      totals[resultId as ResultId] += points ?? 0;
    }
  });

  // vencedor = maior pontuação; empate resolve pela ordem de `results`
  let winner = results[0];
  let best = -Infinity;
  for (const result of results) {
    if (totals[result.id] > best) {
      best = totals[result.id];
      winner = result;
    }
  }
  return winner;
}

/* ------------------------------------------------------------
   DIAGNÓSTICO
   Monta automaticamente um diagnóstico para QUALQUER combinação de
   respostas: identifica o perfil vencedor e junta os sinais de alerta
   que as respostas escolhidas revelaram.
   ------------------------------------------------------------ */

/** Frase de fechamento por perfil, ligando os sinais ao problema central. */
const verdicts: Record<ResultId, string> = {
  fundamentos:
    "Juntos, esses pontos mostram que falta uma base de precificação — por isso o esforço não vira lucro.",
  margem:
    "Juntos, esses pontos explicam por que você fatura, mas o dinheiro não sobra como deveria.",
  escala:
    "Você já está num bom nível: ajustando esses detalhes, dá para crescer com muito mais controle.",
};

export type Diagnosis = {
  /** perfil identificado (carrega curso, CTA, highlights, etc.) */
  result: QuizResult;
  /** sinais de alerta detectados nas respostas reais da pessoa */
  signals: string[];
  /** frase de fechamento do diagnóstico */
  verdict: string;
};

export function buildDiagnosis(answers: number[]): Diagnosis {
  const result = scoreQuiz(answers);

  const signals: string[] = [];
  answers.forEach((optionIndex, questionIndex) => {
    const signal = questions[questionIndex]?.options[optionIndex]?.signal;
    if (signal) signals.push(signal);
  });

  // Caso raro: respondeu tudo "no controle" — não há sinais de alerta.
  const verdict =
    signals.length === 0
      ? "Suas respostas mostram uma operação no controle. O próximo passo é crescer sem perder essa organização."
      : verdicts[result.id];

  return { result, signals, verdict };
}
