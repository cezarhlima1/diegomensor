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
 *
 * Como funciona o rastreio por etapa:
 * O formulário do site envia uma requisição a cada pergunta respondida
 * (não só no final). Cada visitante tem um "ID sessão" fixo durante o
 * preenchimento, então este script sempre procura uma linha existente com
 * aquele ID e atualiza só as respostas novas, em vez de criar uma linha por
 * etapa. Assim dá para ver, na coluna "Status"/"Etapa", exatamente até onde
 * cada pessoa foi e quando parou de responder.
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
  "ID sessão",
  "Status",
  "Etapa",
  "Data e hora (criado)",
  "Última atualização",
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

const COL = HEADERS.reduce((map, header, offset) => {
  map[header] = offset + 1;
  return map;
}, {});

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowBySessionId_(sheet, sessionId) {
  if (!sessionId || sheet.getLastRow() < 2) return 0;
  const finder = sheet
    .getRange(2, COL["ID sessão"], sheet.getLastRow() - 1, 1)
    .createTextFinder(sessionId)
    .matchEntireCell(true);
  const match = finder.findNext();
  return match ? match.getRow() : 0;
}

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

    const sheet = getSheet_();
    const now = new Date();
    const sessionId = payload.sessionId || "";
    const status = payload.completed ? "Completo" : "Em andamento";
    const etapa = payload.step && payload.totalSteps ? `${payload.step}/${payload.totalSteps}` : "";
    const existingRow = findRowBySessionId_(sheet, sessionId);

    if (existingRow) {
      const range = sheet.getRange(existingRow, 1, 1, HEADERS.length);
      const values = range.getValues()[0];
      values[COL["Status"] - 1] = status;
      values[COL["Etapa"] - 1] = etapa;
      values[COL["Última atualização"] - 1] = now;
      values[COL["Origem (source)"] - 1] = payload.source || values[COL["Origem (source)"] - 1];
      PERGUNTAS_EM_ORDEM.forEach((pergunta) => {
        const resposta = respostaPorPergunta[pergunta];
        if (resposta) values[COL[pergunta] - 1] = resposta;
      });
      values[COL["UTM Source"] - 1] = payload.utmSource || values[COL["UTM Source"] - 1];
      values[COL["UTM Medium"] - 1] = payload.utmMedium || values[COL["UTM Medium"] - 1];
      values[COL["UTM Campaign"] - 1] = payload.utmCampaign || values[COL["UTM Campaign"] - 1];
      values[COL["UTM Content"] - 1] = payload.utmContent || values[COL["UTM Content"] - 1];
      values[COL["UTM Term"] - 1] = payload.utmTerm || values[COL["UTM Term"] - 1];
      values[COL["Landing Page"] - 1] = payload.landingPage || values[COL["Landing Page"] - 1];
      values[COL["Referrer"] - 1] = payload.referrer || values[COL["Referrer"] - 1];
      range.setValues([values]);
    } else {
      const linha = new Array(HEADERS.length).fill("");
      linha[COL["ID sessão"] - 1] = sessionId;
      linha[COL["Status"] - 1] = status;
      linha[COL["Etapa"] - 1] = etapa;
      linha[COL["Data e hora (criado)"] - 1] = now;
      linha[COL["Última atualização"] - 1] = now;
      linha[COL["Origem (source)"] - 1] = payload.source || "";
      PERGUNTAS_EM_ORDEM.forEach((pergunta) => {
        linha[COL[pergunta] - 1] = respostaPorPergunta[pergunta] || "";
      });
      linha[COL["UTM Source"] - 1] = payload.utmSource || "";
      linha[COL["UTM Medium"] - 1] = payload.utmMedium || "";
      linha[COL["UTM Campaign"] - 1] = payload.utmCampaign || "";
      linha[COL["UTM Content"] - 1] = payload.utmContent || "";
      linha[COL["UTM Term"] - 1] = payload.utmTerm || "";
      linha[COL["Landing Page"] - 1] = payload.landingPage || "";
      linha[COL["Referrer"] - 1] = payload.referrer || "";
      sheet.appendRow(linha);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
