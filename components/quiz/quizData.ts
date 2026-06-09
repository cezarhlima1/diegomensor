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
      "Você ainda decide preço no feeling ou copiando o concorrente — e isso te deixa exposto. O primeiro passo é enxergar quanto a sua oficina realmente custa antes de pensar em quanto cobrar.",
    highlights: [
      "Descubra o custo real da hora de trabalho",
      "Monte uma base de preço que não depende de achismo",
      "Saiba exatamente onde você está perdendo dinheiro",
    ],
    cta: "Quero começar pelos fundamentos",
  },
  {
    id: "margem",
    kicker: "Seu maior gargalo",
    course: "Margem & Lucro na Oficina",
    tagline: "Você fatura, mas no fim do mês some. Vamos arrumar isso.",
    description:
      "Você já tem preço definido, mas o dinheiro não sobra como deveria. O foco aqui é margem: ajustar o que você cobra para que cada serviço entregue lucro de verdade — sem perder cliente.",
    highlights: [
      "Calcule a margem certa por tipo de serviço",
      "Identifique os serviços que dão prejuízo escondido",
      "Reajuste preços com segurança e argumento",
    ],
    cta: "Quero recuperar minha margem",
  },
  {
    id: "escala",
    kicker: "Seu próximo nível",
    course: "Gestão & Escala",
    tagline: "Sua oficina roda — agora é hora de crescer com controle.",
    description:
      "Você já tem estrutura e equipe, mas crescer sem método vira caos. O foco é gestão: previsibilidade, indicadores e processos para escalar faturamento sem que tudo dependa de você.",
    highlights: [
      "Painel de indicadores para decidir com dados",
      "Precificação padronizada para a equipe inteira",
      "Processos que sustentam o crescimento",
    ],
    cta: "Quero escalar minha oficina",
  },
];

/* ------------------------------------------------------------
   PERGUNTAS (placeholder — substitua pelas reais depois)
   ------------------------------------------------------------ */
export const questions: QuizQuestion[] = [
  {
    id: "preco",
    question: "Como você define o preço dos seus serviços hoje?",
    options: [
      { label: "No feeling, vou no que parece justo", scores: { fundamentos: 2 } },
      { label: "Olho o que o concorrente cobra", scores: { fundamentos: 2, margem: 1 } },
      { label: "Tenho uma planilha, mas não confio 100%", scores: { margem: 2 } },
      { label: "Uso um sistema e reviso com frequência", scores: { escala: 2, margem: 1 } },
    ],
  },
  {
    id: "hora",
    question: "Você sabe quanto custa uma hora de trabalho da sua oficina?",
    options: [
      { label: "Não faço ideia", scores: { fundamentos: 3 } },
      { label: "Tenho uma noção aproximada", scores: { fundamentos: 1, margem: 1 } },
      { label: "Sei o número, mas não uso pra precificar", scores: { margem: 2 } },
      { label: "Sei e baseio meus preços nisso", scores: { escala: 2 } },
    ],
  },
  {
    id: "sobra",
    question: "No fim do mês, sobra dinheiro como você gostaria?",
    options: [
      { label: "Quase nunca sobra nada", scores: { fundamentos: 2, margem: 1 } },
      { label: "Sobra pouco, vivo apertado", scores: { margem: 3 } },
      { label: "Sobra um pouco, mas oscila muito", scores: { margem: 2, escala: 1 } },
      { label: "Sobra bem, quero é crescer", scores: { escala: 3 } },
    ],
  },
  {
    id: "equipe",
    question: "Quantas pessoas trabalham na sua oficina?",
    options: [
      { label: "Só eu", scores: { fundamentos: 2 } },
      { label: "Eu e mais 1 ou 2", scores: { fundamentos: 1, margem: 1 } },
      { label: "Uma equipe de 3 a 6", scores: { margem: 1, escala: 1 } },
      { label: "Mais de 6 pessoas", scores: { escala: 3 } },
    ],
  },
  {
    id: "incomodo",
    question: "Qual desses te incomoda mais hoje?",
    options: [
      { label: "Não saber se estou cobrando certo", scores: { fundamentos: 3 } },
      { label: "Trabalhar muito e ver pouco resultado", scores: { margem: 3 } },
      { label: "Depender de mim pra tudo funcionar", scores: { escala: 3 } },
      { label: "Não conseguir crescer de forma organizada", scores: { escala: 2, margem: 1 } },
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
