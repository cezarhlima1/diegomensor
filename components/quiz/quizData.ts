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
    ? "Primeiro… parabéns, tá? Se tu sabe quanto entrou e quanto realmente sobrou no fim do mês, já tá na frente de muita oficina. Ter clareza dos teus números é um baita ponto de partida."
    : month === 1
      ? "Primeiro, uma coisa chamou atenção. Tua oficina tem carro entrando, mas o dinheiro que sobra não acompanha todo esse esforço. Isso indica que algum ponto da gestão ou da precificação pode estar segurando teu lucro."
      : "Primeiro, aqui precisa acender um alerta. Se tu trabalha pra caramba, o dinheiro entra e mesmo assim não sobra, provavelmente tua oficina tá deixando dinheiro na mesa. E muitas vezes isso começa na precificação.";

  const priceBase = labor === 0
    ? "Agora, olhando pra forma como tu define teus preços, tem um ponto muito positivo: tu já calcula tua hora técnica. Isso traz muito mais segurança pro orçamento e evita trabalhar no achismo."
    : labor === 1
      ? "Agora, olhando pros teus preços, tem um ponto de atenção: usar a oficina do vizinho como base. A concorrência pode ser referência, mas nunca pode definir teu preço, porque os custos de cada oficina são diferentes."
      : "Agora, olhando pros teus preços, aqui mora um perigo: mudar o valor conforme a situação. Sem um padrão, cada orçamento segue uma lógica e fica muito difícil saber se aquele serviço realmente deu lucro.";
  const partsBase = parts === 0
    ? "Na venda das peças, tu tá no caminho certo. Ter um markup definido protege tua margem e transforma a venda de peças em uma fonte real de lucro pra oficina."
    : parts === 1
      ? "Na venda das peças, tem um ponto de atenção. Quando tu muda o markup conforme o cliente ou serviço, tua margem também muda e tu perde a previsibilidade de quanto realmente vai sobrar."
      : "Na venda das peças, temos um problema importante. Repassar praticamente pelo preço de custo faz tua oficina abrir mão de uma receita que deveria ajudar a gerar lucro e caixa.";
  const costBase = costs === 0
    ? "Sobre tua hora técnica, ótimo: tu já sabe esse número. Esse é um dos indicadores mais importantes pra saber se o valor cobrado pelo serviço realmente faz sentido."
    : costs === 1
      ? "Sobre tua hora técnica, ainda falta um pouco de clareza. Se tu só tem uma noção ou dúvida sobre o cálculo, existe uma boa chance de estar cobrando menos do que deveria."
      : "Sobre tua hora técnica, aqui precisa de atenção urgente. Se tu ainda não sabe quanto ela vale, teus orçamentos estão sendo feitos sem uma das principais referências de preço da oficina.";

  const confidence = budget === 0
    ? "Na hora de apresentar o orçamento, outro ponto positivo: tu consegue defender teu preço com segurança. Quando existe uma lógica por trás do valor, fica muito mais fácil explicar pro cliente o que ele tá pagando."
    : budget === 1
      ? "Na hora de apresentar o orçamento, aparece uma insegurança quando o cliente questiona o preço. Isso mostra que tu ainda precisa ter mais clareza da tua precificação pra defender teu valor com confiança."
      : "Na hora de apresentar o orçamento, temos um alerta: se o cliente questiona e tu baixa o preço, quem começa a definir tua margem é ele. E aí teu lucro fica completamente vulnerável.";
  const cash = separation === 0
    ? "Pra fechar, mais um ponto positivo: tu conhece o custo da tua operação. Saber quanto custa manter a oficina funcionando te dá muito mais segurança pra tomar decisões."
    : separation === 1
      ? "Pra fechar, ainda existem custos da tua operação que passam despercebidos. E são justamente esses gastos que muitas vezes fazem o lucro desaparecer sem tu perceber."
      : "Pra fechar, apareceu um ponto crítico: tu ainda não sabe exatamente quanto custa manter tua oficina aberta. Sem esse número, fica muito difícil saber quanto realmente precisa cobrar pelos serviços.";

  const verdict = result.id === "controle"
    ? "No geral, tua oficina tem uma base muito boa. Agora é garantir que hora técnica, markup e custos estejam sempre atualizados e sejam aplicados em todos os serviços, sem exceção. Porque preço certo não é achismo, jovem. É número."
    : result.id === "atencao"
      ? "O diagnóstico mostra que tu não precisa necessariamente de mais carros, jovem. Tu precisa fechar as brechas que fazem uma parte do faturamento escapar. Quando tu padroniza os cálculos, ganha previsibilidade e segurança pra cobrar o preço certo."
      : "Esse diagnóstico acende um alerta urgente, jovem. Antes de buscar mais movimento, tu precisa corrigir a base dos preços e organizar os números. Essa pode ser a forma mais rápida de parar de perder dinheiro todos os dias.";

  return { result, analysis: [`${financial}\n\n${priceBase}`, `${partsBase}\n\n${confidence}`, `${costBase}\n\n${cash}`], verdict };
}
