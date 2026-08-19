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
    ? "Primeiro… parabéns, tá? Se tu sabe na ponta do lápis quanto entrou e quanto realmente sobrou no fim do mês, tu já tá na frente da maioria dos donos de oficina. Normalmente quem tem uma relação saudável com os próprios números acompanha isso de perto. E esse é um baita ponto de partida."
    : month === 1
      ? "Primeiro, quero trazer uma coisa que chamou atenção. A tua oficina tem carro entrando, mas o dinheiro que sobra ainda não acompanha todo o esforço que tu faz. Geralmente existe algum detalhe na gestão ou na precificação impedindo a oficina de lucrar tudo o que poderia. Mas te acalma, isso é mais fácil de resolver do que tu imagina."
      : "Primeiro, vou te falar uma coisa… quando tu trabalha pra caramba desse jeito, o dinheiro entra e mesmo assim não sobra nada no fim do mês, tu precisa acender um alerta urgente. Na maioria das vezes o problema não é falta de serviço. É que tua oficina tá deixando dinheiro na mesa sem perceber. E por que ligar esse alerta? Porque cobrar errado é um começo perigoso de incêndio que tu vai precisar apagar lá na frente.";

  const priceBase = labor === 0
    ? "Agora, olhando especificamente pra forma como tu define teus preços, gostei de ver uma coisa. Tu já procura calcular tua hora técnica antes de montar um orçamento. Isso faz muita diferença, porque quem trabalha baseado em números toma decisões muito mais seguras do que quem trabalha no achismo. E pode parecer que não, mas isso é importante demais pra ser ignorado. Vai por mim! Assim como a venda de peças, que muita oficina acaba deixando de lado."
    : labor === 1
      ? "Agora, olhando pra forma como tu define teus preços, tem um ponto que merece atenção. Basear teus números na oficina do vizinho não te ajuda em quase nada, porque tu não sabe quais são os custos que ele tem. Se a estrutura dele custa menos que a tua, quem absorve essa diferença é a tua oficina. ‘Ah, Diego… então eu ignoro a concorrência?’ Claro que não. Ela serve como referência, mas nunca pode definir o preço da tua oficina. E pode parecer que não, mas isso é importante demais pra ser ignorado. Vai por mim! Assim como a venda de peças, que muita oficina acaba deixando de lado."
      : "Agora, olhando pra forma como tu define teus preços, aqui mora um dos maiores perigos. Quando tu muda o valor conforme a situação, cada orçamento passa a seguir uma lógica diferente. Hoje tu cobra de um jeito, amanhã de outro. E depois fica praticamente impossível saber se aquele serviço realmente deu lucro. E pode parecer que não, mas isso é importante demais pra ser ignorado. Vai por mim! Assim como a venda de peças, que muita oficina acaba deixando de lado.";
  const partsBase = parts === 0
    ? "A venda das peças precisa ser um PLUS dentro da oficina: a operação limpa onde tu compra, acrescenta a margem correta e vende. O markup é um dos grandes responsáveis pela lucratividade da oficina. E como tu já tem um markup bem definido e segue esse padrão, tá protegendo tua margem e evitando decisões no impulso."
    : parts === 1
      ? "A venda das peças precisa ser um PLUS dentro da oficina: a operação limpa onde tu compra, acrescenta a margem correta e vende. Quando tu muda o markup conforme o cliente ou o serviço, tua margem também muda. Só que o teu custo continua o mesmo. A equipe continua a mesma. A estrutura continua a mesma. O único que muda é o quanto sobra no teu bolso. E quando isso vira rotina, tu perde completamente a previsibilidade do teu lucro."
      : "A venda das peças precisa ser um PLUS dentro da oficina: a operação limpa onde tu compra, acrescenta a margem correta e vende. Repassar a peça praticamente pelo preço que tu pagou é um erro grave. Na hora parece uma boa estratégia, mas tua oficina abre mão de uma receita que deveria virar lucro. Porque tu não é revendedor de peça. Quanto antes entender isso, mais lucro e caixa vai ter no fim do mês.";
  const costBase = costs === 0
    ? "Saber como precificar certo vai te trazer uma clareza tão grande que tu vai pensar: ‘Por que eu não sentei pra ver isso antes?’ Entender a hora técnica deveria ser obrigatório, e é muito bom que tu já tenha esse número. Esse é um dos indicadores mais importantes da oficina, porque dá segurança pra saber se o preço realmente faz sentido."
    : costs === 1
      ? "Saber como precificar certo vai te trazer uma clareza tão grande que tu vai pensar: ‘Por que eu não sentei pra ver isso antes?’ Entender a hora técnica deveria ser obrigatório. Se hoje tu só tem uma noção desse valor ou ainda tem dúvidas sobre o cálculo, vale parar e olhar isso com atenção. Existe uma boa chance de tu estar cobrando menos do que deveria."
      : "Saber como precificar certo vai te trazer uma clareza tão grande que tu vai pensar: ‘Por que eu não sentei pra ver isso antes?’ Entender a hora técnica deveria ser obrigatório. Se hoje tu ainda não sabe exatamente quanto ela vale, tu precisa olhar pra isso urgente. Sem esse número, praticamente todo orçamento continua sendo feito sem uma referência confiável.";

  const confidence = budget === 0
    ? "Se esse B.O. do markup das peças ficou claro, quero trazer outro ponto importante: passar o orçamento pro cliente. Se tu apresenta teus orçamentos com segurança pra explicar o valor do serviço, aí tu é o cara mesmo. A gente não tem que ter medo de explicar o que é certo. E normalmente isso acontece quando existe uma lógica por trás do preço. Top demais."
    : budget === 1
      ? "Se esse B.O. do markup das peças ficou claro, quero trazer outro ponto importante: passar o orçamento pro cliente. Se nessa hora aparece um sentimento de desconforto, vale ligar um alerta. Quando o cliente questiona o preço, tu ainda se sente inseguro. É hora de entender melhor a tua precificação pra explicar o valor com mais confiança. E calma… na maioria das vezes isso não acontece porque tá caro. Acontece porque ainda falta segurança pra provar que tu tá certo."
      : "Se esse B.O. do markup das peças ficou claro, quero trazer outro ponto importante: passar o orçamento pro cliente. Se quando o cliente questiona o valor o orçamento acaba diminuindo, a coisa tá feita. Quem passa a definir o teu lucro deixa de ser tu. Passa a ser o cliente. E eu nem preciso te explicar o tamanho desse B.O., né?";
  const cash = separation === 0
    ? "Pra fechar, apareceu mais um ponto positivo. Tu consegue separar o caixa da oficina da tua conta pessoal e tira um pró-labore definido. Isso faz toda diferença, porque te mostra o que é dinheiro da empresa, o que é tua retirada e o que realmente virou lucro."
    : separation === 1
      ? "Pra fechar, apareceu um detalhe que vale tua atenção. O caixa da oficina e a tua conta pessoal ainda se misturam em alguns momentos. E quando isso acontece, fica fácil confundir dinheiro disponível com lucro e perder a clareza do que a oficina realmente tá gerando."
      : "Pra fechar, apareceu um dos pontos mais importantes desse diagnóstico. Hoje tu ainda não separa o caixa da oficina da tua conta pessoal e não tem um pró-labore definido. Enquanto isso não estiver claro, fica muito difícil saber quanto a empresa realmente lucrou e quanto tu pode tirar sem machucar o caixa.";

  const verdict = result.id === "controle"
    ? "No geral, tua oficina tem uma base muito boa. Agora é garantir que hora técnica, markup e custos estejam sempre atualizados e sejam aplicados em todos os serviços, sem exceção. Porque preço certo não é achismo, jovem. É número."
    : result.id === "atencao"
      ? "O diagnóstico mostra que tu não precisa necessariamente de mais carros, jovem. Tu precisa fechar as brechas que fazem uma parte do faturamento escapar. Quando tu padroniza os cálculos, ganha previsibilidade e segurança pra cobrar o preço certo."
      : "Esse diagnóstico acende um alerta urgente, jovem. Antes de buscar mais movimento, tu precisa corrigir a base dos preços e organizar os números. Essa pode ser a forma mais rápida de parar de perder dinheiro todos os dias.";

  return { result, analysis: [`${financial}\n\n${priceBase}`, `${partsBase}\n\n${confidence}`, `${costBase}\n\n${cash}`], verdict };
}
