/**
 * Google Apps Script do formulário de Aplicação para a Mentoria OAG.
 *
 * Como publicar:
 * 1. Crie uma planilha nova no Google Sheets (ou reaproveite uma existente).
 * 2. Na planilha, abra Extensões > Apps Script.
 * 3. Apague o conteúdo padrão do editor e cole este arquivo inteiro.
 * 4. Troque SPREADSHEET_ID abaixo pelo ID da sua planilha (está na URL,
 *    entre /d/ e /edit).
 * 5. Salve (ícone de disquete) e clique em Implantar > Nova implantação.
 * 6. Em "Selecionar tipo", escolha "App da Web".
 * 7. Execute como "Eu" e defina acesso para "Qualquer pessoa".
 * 8. Clique em Implantar, autorize as permissões pedidas pelo Google.
 * 9. Copie a URL que termina em /exec.
 * 10. Cole essa URL na variável MENTORIA_SHEETS_WEBHOOK_URL no ambiente do site
 *     (.env.local para rodar localmente, e nas Environment Variables do
 *     projeto na Vercel para produção).
 *
 * Sempre que editar este script depois de já implantado, use
 * Implantar > Gerenciar implantações > editar (ícone de lápis) > Nova versão,
 * senão a URL antiga continua rodando o código antigo.
 */

const SPREADSHEET_ID = "COLE_AQUI_O_ID_DA_PLANILHA";
const SHEET_NAME = "Aplicações";

const PERGUNTAS_EM_ORDEM = [
  "Qual é o seu WhatsApp pessoal?",
  "Qual é o seu nome?",
  "Qual é o seu melhor e-mail?",
  "Qual cidade e estado você mora?",
  "Hoje você é:",
  "Qual seu tipo de oficina?",
  "Há quanto tempo atua no setor automotivo?",
  "Quantas pessoas existem hoje na sua operação?",
  "Qual a faixa de faturamento mensal da sua operação?",
  "Como você se sente hoje em relação à sua oficina?",
  "Qual seu maior desafio hoje dentro da oficina?",
  "O que fez você procurar ajuda justamente neste momento?",
  "Na sua opinião, o que está impedindo sua oficina de crescer hoje?",
  "Hoje, qual dessas situações representa melhor sua oficina?",
  "Se nada mudar nos próximos 12 meses, o que pode acontecer com sua oficina?",
  "Onde você quer que sua oficina esteja nos próximos 12 meses?",
  "Você pretende resolver esse problema:",
  "Quem participa da decisão de investir na sua empresa?",
  "Caso faça sentido para sua oficina, você estaria disposto a iniciar a mentoria nos próximos dias?",
];

const HEADERS = [
  "Data e hora",
  "Origem (source)",
  ...PERGUNTAS_EM_ORDEM,
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "UTM Term",
  "Landing Page",
  "Referrer",
];

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const respostas = JSON.parse(payload.answers || "[]");

    const respostaPorPergunta = {};
    respostas.forEach((item) => {
      respostaPorPergunta[item.pergunta] = item.resposta;
    });

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    const linha = [
      new Date(),
      payload.source || "",
      ...PERGUNTAS_EM_ORDEM.map((pergunta) => respostaPorPergunta[pergunta] || ""),
      payload.utmSource || "",
      payload.utmMedium || "",
      payload.utmCampaign || "",
      payload.utmContent || "",
      payload.utmTerm || "",
      payload.landingPage || "",
      payload.referrer || "",
    ];

    sheet.appendRow(linha);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
