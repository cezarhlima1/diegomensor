/**
 * Google Apps Script da pesquisa da Imersão DESTRAVE.
 *
 * Como publicar:
 * 1. Na planilha, abra Extensões > Apps Script.
 * 2. Cole este arquivo no editor e salve.
 * 3. Clique em Implantar > Nova implantação > App da Web.
 * 4. Execute como "Eu" e permita acesso para "Qualquer pessoa".
 * 5. Copie a URL /exec para DESTRAVE_SHEETS_WEBHOOK_URL no ambiente do site.
 */

const SPREADSHEET_ID = "1u1QPiv6S-Tzuy1TObtX3FQV8h4CfTmvvIOjQdDzXmuU";
const SHEET_NAME = "Respostas";

const HEADERS = [
  "Data e hora",
  "Nome",
  "WhatsApp",
  "Problema que mais incomoda",
  "Área em que mais perde dinheiro",
  "O que já tentou para resolver",
  "Maior dificuldade para fechar o serviço",
  "3 problemas para o Diego solucionar",
  "Solução que faria a aula valer a pena",
  "Faixa de faturamento mensal",
];

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const answers = JSON.parse(payload.answers || "{}");
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      payload.name || "",
      payload.phone || "",
      answers.problemaPrincipal || "",
      answers.areaPerda || "",
      answers.tentativaSolucao || "",
      answers.dificuldadeFechamento || "",
      answers.tresProblemas || "",
      answers.solucaoEsperada || "",
      answers.faturamento || "",
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
