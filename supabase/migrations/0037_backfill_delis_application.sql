-- Recupera as respostas parciais da aplicação da Delis a partir do backup.
-- O filtro por sessionId impede que qualquer outro lead seja alterado.
update public.crm_leads
set
  application = $application$
  {
    "sessionId": "812ff2bd-dab2-4b1d-9c3e-aae788b71d81",
    "submittedAt": "2026-09-03T17:35:53.000Z",
    "step": 12,
    "totalSteps": 13,
    "completed": false,
    "attribution": {
      "utmSource": "instagram",
      "utmMedium": "organico",
      "utmCampaign": "mentoria_oag",
      "utmContent": "biografia",
      "utmTerm": "",
      "landingPage": "https://www.mensortreinamentos.com.br/formulario?utm_source=instagram&utm_medium=organico&utm_campaign=mentoria_oag&utm_content=biografia&fbclid=PAcGRvZgJmZGlkFlDbOOsM7BAfBS6Ps_VSDFfMthemQmFleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAadpu_sMlPThDklS17w8EuZvy1jSQaAe5GNZ0tKAv08d1v6iHqzR_BdvS3PtZg_aem_JIj78DxXOwkR21UVe1U_kg",
      "referrer": "https://l.instagram.com/"
    },
    "answers": [
      { "numero": 1, "pergunta": "Qual é o seu WhatsApp pessoal?", "resposta": "+5555981554254" },
      { "numero": 2, "pergunta": "Qual é o seu nome?", "resposta": "Delis" },
      { "numero": 3, "pergunta": "Qual cidade e estado você mora?", "resposta": "Não preenchido" },
      { "numero": 4, "pergunta": "Hoje você é:", "resposta": "Dono de oficina" },
      { "numero": 5, "pergunta": "Qual seu tipo de oficina?", "resposta": "Multimarcas" },
      { "numero": 6, "pergunta": "Há quanto tempo atua no setor automotivo?", "resposta": "Mais de 15 anos" },
      { "numero": 7, "pergunta": "Quantas pessoas existem hoje na sua operação?", "resposta": "2–5 pessoas" },
      { "numero": 8, "pergunta": "Qual a faixa de faturamento mensal da sua operação?", "resposta": "R$ 80–150 mil" },
      { "numero": 9, "pergunta": "Como você se sente hoje em relação à sua oficina?", "resposta": "Satisfeito, mas quero crescer" },
      { "numero": 10, "pergunta": "Hoje, qual dessas situações representa melhor sua oficina?", "resposta": "Tenho equipe, mas continuo apagando incêndios." },
      { "numero": 11, "pergunta": "Você pretende resolver esse problema:", "resposta": "Ainda este ano." },
      { "numero": 12, "pergunta": "Quem participa da decisão de investir na sua empresa?", "resposta": "Eu e meu marido." },
      { "numero": 13, "pergunta": "Caso faça sentido para sua oficina, você estaria disposto a iniciar a mentoria nos próximos dias?", "resposta": "Não preenchido" }
    ]
  }
  $application$::jsonb,
  notes = 'Aplicação iniciada e ainda não finalizada.',
  next_action = 'Concluir aplicação',
  updated_at = now()
where application->>'sessionId' = '812ff2bd-dab2-4b1d-9c3e-aae788b71d81';

do $$
begin
  if not exists (
    select 1
    from public.crm_leads
    where application->>'sessionId' = '812ff2bd-dab2-4b1d-9c3e-aae788b71d81'
      and application->>'step' = '12'
  ) then
    raise exception 'Aplicação da Delis não encontrada; nenhuma linha foi alterada.';
  end if;
end $$;
