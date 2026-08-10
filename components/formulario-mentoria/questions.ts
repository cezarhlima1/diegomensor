export type FieldType = "text" | "email" | "tel" | "textarea" | "choice";

export type Question = {
  id: string;
  number: number;
  label: string;
  description?: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
};

export const steps = [
  {
    eyebrow: "Sobre você",
    title: "Vamos começar pelo básico.",
    description: "Esses dados serão usados apenas para entrar em contato sobre a sua aplicação.",
    questions: [
      { id: "whatsapp", number: 1, label: "Qual é o seu WhatsApp pessoal?", type: "tel", placeholder: "(00) 00000-0000" },
      { id: "nome", number: 2, label: "Qual é o seu nome?", type: "text", placeholder: "Seu nome completo" },
      { id: "email", number: 3, label: "Qual é o seu melhor e-mail?", type: "email", placeholder: "voce@email.com" },
      { id: "cidadeEstado", number: 4, label: "Qual cidade e estado você mora?", type: "text", placeholder: "Ex.: Caxias do Sul / RS" },
    ],
  },
  {
    eyebrow: "Sua operação",
    title: "Quero entender o momento da sua oficina.",
    description: "Selecione a alternativa que mais se aproxima da sua realidade atual.",
    questions: [
      { id: "papel", number: 5, label: "Hoje você é:", type: "choice", options: ["Dono de oficina", "Sócio", "Gestor", "Mecânico autônomo", "Funcionário da área", "Outro"] },
      { id: "tipoOficina", number: 6, label: "Qual seu tipo de oficina?", type: "choice", options: ["Mecânica geral [Carros]", "Mecânica geral [Motos]", "Funilaria/Pintura", "Elétrica", "Multimarcas", "Outro"] },
      { id: "tempoSetor", number: 7, label: "Há quanto tempo atua no setor automotivo?", type: "choice", options: ["Menos de 1 ano", "1–3 anos", "4–7 anos", "8–15 anos", "Mais de 15 anos"] },
      { id: "tamanhoEquipe", number: 8, label: "Quantas pessoas existem hoje na sua operação?", type: "choice", options: ["Trabalho sozinho", "2–5 pessoas", "6–10 pessoas", "11–20 pessoas", "Mais de 20 pessoas"] },
      { id: "faturamento", number: 9, label: "Qual a faixa de faturamento mensal da sua operação?", type: "choice", options: ["Até R$ 10 mil", "R$ 10–30 mil", "R$ 30–80 mil", "R$ 80–150 mil", "Mais de R$ 150 mil"] },
      { id: "sentimento", number: 10, label: "Como você se sente hoje em relação à sua oficina?", type: "choice", options: ["Sobrecarregado", "Estagnado", "Perdido na gestão", "Satisfeito, mas quero crescer"] },
    ],
  },
  {
    eyebrow: "O desafio",
    title: "O que está travando seu crescimento?",
    description: "Responda com sinceridade. Quanto mais contexto, melhor será a análise da sua aplicação.",
    questions: [
      { id: "maiorDesafio", number: 11, label: "Qual seu maior desafio hoje dentro da oficina?", description: "Qual é o principal problema que mais toma seu tempo, dinheiro ou energia hoje dentro da oficina?", type: "textarea", placeholder: "Conte com detalhes o que está acontecendo..." },
      { id: "momentoAjuda", number: 12, label: "O que fez você procurar ajuda justamente neste momento?", description: "O que aconteceu ou mudou para você decidir que precisa buscar ajuda agora?", type: "textarea", placeholder: "Explique o que levou você a tomar essa decisão..." },
      { id: "impedimento", number: 13, label: "Na sua opinião, o que está impedindo sua oficina de crescer hoje?", description: "Qual é o principal fator que está impedindo sua oficina de chegar ao próximo nível?", type: "textarea", placeholder: "Descreva o principal impedimento..." },
    ],
  },
  {
    eyebrow: "Presente e futuro",
    title: "Onde você está e onde quer chegar?",
    description: "Essa etapa ajuda a dimensionar a distância entre a operação atual e a desejada.",
    questions: [
      { id: "situacao", number: 14, label: "Hoje, qual dessas situações representa melhor sua oficina?", type: "choice", options: ["A oficina depende totalmente de mim.", "Tenho equipe, mas continuo apagando incêndios.", "Meu gestor não assume responsabilidades.", "Tenho dificuldade em organizar processos.", "Quero crescer, mas não consigo sair da operação.", "Outra."] },
      { id: "consequencia", number: 15, label: "Se nada mudar nos próximos 12 meses, o que pode acontecer com sua oficina?", description: "Se você continuar exatamente como está hoje, o que acredita que pode acontecer com sua oficina e com você?", type: "textarea", placeholder: "Pense nas consequências para a empresa e para sua rotina..." },
      { id: "objetivo12Meses", number: 16, label: "Onde você quer que sua oficina esteja nos próximos 12 meses?", description: "Pensando em faturamento, equipe, organização e na sua própria rotina, onde você gostaria de estar?", type: "textarea", placeholder: "Descreva o cenário que você quer construir..." },
    ],
  },
  {
    eyebrow: "Decisão",
    title: "Última etapa da sua aplicação.",
    description: "Quero entender seu nível de prioridade e como funciona a decisão na sua empresa.",
    questions: [
      { id: "prazo", number: 17, label: "Você pretende resolver esse problema:", type: "choice", options: ["Ainda este mês.", "Nos próximos 90 dias.", "Ainda este ano.", "Estou apenas pesquisando."] },
      { id: "decisores", number: 18, label: "Quem participa da decisão de investir na sua empresa?", type: "choice", options: ["Eu decido sozinho.", "Eu e meu sócio.", "Eu e minha esposa.", "Eu e meu marido.", "Outra pessoa."] },
      { id: "disponibilidade", number: 19, label: "Caso faça sentido para sua oficina, você estaria disposto a iniciar a mentoria nos próximos dias?", type: "choice", options: ["Sim, quero resolver isso agora.", "Sim, se eu entender que a mentoria faz sentido para o meu momento.", "Talvez, preciso avaliar melhor.", "Não, neste momento estou apenas buscando informações."] },
    ],
  },
] satisfies Array<{ eyebrow: string; title: string; description: string; questions: Question[] }>;

export const allQuestions: Question[] = steps.reduce<Question[]>(
  (questions, step) => questions.concat(step.questions),
  [],
);
