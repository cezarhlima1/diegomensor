export type ResultId = "risco" | "atencao" | "controle";

export type QuizResult = { id: ResultId; kicker: string; course: string; tagline: string; description: string };
export type QuizOption = { label: string; scores: Partial<Record<ResultId, number>>; signal?: string };
export type QuizQuestion = { id: string; question: string; options: QuizOption[] };

export const results: QuizResult[] = [
  { id: "risco", kicker: "Alerta de precificação", course: "Sua oficina pode estar perdendo dinheiro todos os dias.", tagline: "Suas respostas mostram que boa parte dos preços ainda é definida sem uma base segura.", description: "Quando hora técnica, markup, custos e retiradas não seguem um cálculo claro, uma oficina cheia pode trabalhar muito e ainda terminar o mês sem lucro." },
  { id: "atencao", kicker: "Ponto de atenção", course: "Você já controla uma parte, mas ainda existem brechas na sua precificação.", tagline: "Algumas decisões são calculadas e outras ainda dependem da situação, do cliente ou da concorrência.", description: "Essa variação tira a previsibilidade da margem. O próximo passo é transformar o que hoje é aproximação em um padrão baseado nos números reais da sua oficina." },
  { id: "controle", kicker: "Boa base", course: "Sua oficina demonstra mais controle sobre os preços.", tagline: "Você já toma decisões melhores do que a maioria, mas vale validar se todos os cálculos acompanham os custos atuais.", description: "Custos mudam, e preço certo não é um número definido uma vez para sempre. Revisar hora técnica, markup e custo operacional protege sua margem e aumenta sua segurança ao defender o orçamento." },
];

export const questions: QuizQuestion[] = [
  { id: "fim-do-mes", question: "No fim do mês, qual cenário é mais comum na sua oficina?", options: [
    { label: "Sei exatamente quanto entrou e quanto sobrou.", scores: { controle: 2 } },
    { label: "O movimento existe, mas sobra menos do que eu esperava.", scores: { atencao: 2 }, signal: "O movimento existe, mas sobra menos do que você esperava no fim do mês." },
    { label: "Trabalho muito e, no final, não sobra nada.", scores: { risco: 2 }, signal: "Você trabalha muito, mas o esforço ainda não está se transformando em lucro." },
  ] },
  { id: "mao-de-obra", question: "Hoje, como você define o valor da mão de obra/hora técnica na sua oficina?", options: [
    { label: "Tenho um cálculo baseado nos custos da operação.", scores: { controle: 2 } },
    { label: "Me baseio principalmente no mercado e na concorrência.", scores: { atencao: 2 }, signal: "A hora técnica é definida olhando a concorrência, não o custo real da sua operação." },
    { label: "Vou definindo conforme cada situação.", scores: { risco: 2 }, signal: "O valor da mão de obra muda conforme a situação e acaba virando um chute." },
  ] },
  { id: "venda-peca", question: "Quando você vende uma peça para o cliente:", options: [
    { label: "Tenho um markup definido e sigo um padrão.", scores: { controle: 2 } },
    { label: "Depende muito do cliente e da situação.", scores: { atencao: 2 }, signal: "O markup das peças varia conforme o cliente e deixa sua margem imprevisível." },
    { label: "Geralmente repasso praticamente o preço que paguei.", scores: { risco: 2 }, signal: "As peças são repassadas quase pelo custo e podem não contribuir com o lucro da oficina." },
  ] },
  { id: "orcamento-questionado", question: "Quando o cliente questiona o valor do orçamento, você costuma:", options: [
    { label: "Explico com segurança como aquele preço foi calculado.", scores: { controle: 2 } },
    { label: "Defendo o orçamento, mas fico desconfortável.", scores: { atencao: 2 }, signal: "Você ainda não se sente totalmente seguro para defender o preço calculado." },
    { label: "Diminuo o valor na maioria das vezes.", scores: { risco: 2 }, signal: "Quando o cliente questiona, você reduz o preço e abre mão da margem." },
  ] },
  { id: "custo-oficina", question: "Hoje você sabe exatamente quanto custa manter sua oficina aberta todos os meses?", options: [
    { label: "Sim, e refaço esse cálculo sempre.", scores: { controle: 2 } },
    { label: "Sei mais ou menos.", scores: { atencao: 2 }, signal: "Você conhece aproximadamente os custos, mas ainda não tem o valor exato da operação." },
    { label: "Nem sei o que é hora técnica.", scores: { risco: 2 }, signal: "Sem conhecer a hora técnica e o custo mensal, não existe uma base segura para formar preços." },
  ] },
  { id: "caixa-pessoal", question: "Consegue separar o caixa da oficina da sua conta pessoal?", options: [
    { label: "Sim, tiro um pró-labore definido.", scores: { controle: 2 } },
    { label: "Mais ou menos, às vezes sim, outras não.", scores: { atencao: 2 }, signal: "O dinheiro pessoal e o caixa da oficina ainda se misturam em alguns momentos." },
    { label: "Não. Nem sei fazer esse cálculo.", scores: { risco: 2 }, signal: "Sem pró-labore e separação de caixa, fica difícil saber o lucro real da oficina." },
  ] },
];

export type Diagnosis = { result: QuizResult; analysis: string[]; verdict: string };

export function buildDiagnosis(answers: number[]): Diagnosis {
  const choices = questions.map((_, index) => answers[index] ?? 1);
  const severity = choices.reduce((sum, choice) => sum + choice, 0);
  const result = severity >= 8 ? results[0] : severity >= 4 ? results[1] : results[2];
  const [month, labor, parts, budget, costs, separation] = choices;

  const financial = month === 0
    ? "Tu demonstra uma relação saudável com os números e já acompanha o que entra e o que realmente sobra. Isso te coloca à frente da maioria, mas esse controle só protege o lucro quando os preços também acompanham os custos reais da operação."
    : month === 1
      ? "A oficina tem movimento, mas o dinheiro que sobra ainda não acompanha todo o esforço que tu faz. Isso mostra que o problema provavelmente não está na falta de serviço, e sim em detalhes da gestão e da precificação que estão segurando uma parte do teu lucro."
      : "A oficina trabalha bastante e, mesmo assim, o dinheiro não permanece no fim do mês. Esse é um alerta importante: o problema provavelmente não é falta de serviço, mas dinheiro sendo deixado na mesa sem que tu perceba — e preço errado costuma ser o começo desse incêndio.";

  const priceBase = labor === 0
    ? "A tua hora técnica parte de um cálculo, o que dá uma base mais segura para tomar decisões."
    : labor === 1
      ? "A tua hora técnica ainda recebe influência demais do mercado e da concorrência. A oficina do vizinho pode servir como referência, mas nunca como cálculo, porque a estrutura e os custos dele não são os teus."
      : "A tua hora técnica muda conforme a situação, fazendo cada orçamento seguir uma lógica diferente. Assim, fica praticamente impossível saber se o serviço realmente deu lucro.";
  const partsBase = parts === 0
    ? "O markup definido nas peças é outro ponto positivo, porque protege a margem e evita decisões por impulso."
    : parts === 1
      ? "Ao mesmo tempo, o markup das peças varia conforme o cliente ou o serviço. O custo continua igual; o que muda é apenas o quanto sobra no teu bolso, tirando a previsibilidade do lucro."
      : "A situação fica mais delicada nas peças: repassar praticamente pelo preço de compra faz a oficina abrir mão de uma receita que deveria contribuir para o lucro e para o caixa.";
  const costBase = costs === 0
    ? "Como tu revisa os custos da operação, existe uma boa estrutura para validar e atualizar esses números com frequência."
    : costs === 1
      ? "Como o custo mensal ainda é conhecido apenas por aproximação, despesas importantes podem passar despercebidas e fazer o lucro desaparecer."
      : "Sem conhecer claramente o custo mensal e o valor da hora técnica, os orçamentos continuam sem uma referência confiável.";

  const confidence = budget === 0
    ? "Essa base também aparece na segurança para explicar o orçamento ao cliente — sinal de que existe uma lógica por trás do preço."
    : budget === 1
      ? "O desconforto ao defender o orçamento indica que ainda falta confiança nos próprios números. Na maioria das vezes não é porque está caro, mas porque falta segurança para provar que o preço está certo."
      : "Quando o orçamento diminui sempre que o cliente questiona, quem passa a definir o lucro é o cliente. Isso corrói uma margem que já pode estar apertada.";
  const cash = separation === 0
    ? "A separação entre o caixa da oficina e a conta pessoal, com pró-labore definido, ajuda a enxergar esse resultado com muito mais clareza."
    : separation === 1
      ? "A mistura ocasional entre o caixa da oficina e a conta pessoal ainda distorce a visão do que é lucro e do que é apenas dinheiro disponível."
      : "Sem separar o caixa da oficina da conta pessoal e sem um pró-labore definido, fica muito difícil saber quanto a empresa realmente lucra.";

  const verdict = result.id === "controle"
    ? "No geral, tua oficina tem uma boa base. O próximo passo é garantir que hora técnica, markup e custos estejam sempre atualizados e sejam aplicados em todos os serviços, sem exceção."
    : result.id === "atencao"
      ? "O diagnóstico mostra que tu não precisa necessariamente de mais carros: precisa fechar as brechas que fazem uma parte do faturamento escapar. Padronizar os cálculos vai trazer previsibilidade e segurança para cobrar o preço certo."
      : "O diagnóstico acende um alerta urgente. Antes de buscar mais movimento, tu precisa corrigir a base dos preços e organizar os números; essa pode ser a forma mais rápida de parar de perder dinheiro todos os dias.";

  return { result, analysis: [financial, `${priceBase} ${partsBase} ${costBase}`, `${confidence} ${cash}`], verdict };
}
