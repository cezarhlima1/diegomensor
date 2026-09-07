/**
 * Google Apps Script da planilha "Automações de cadastro ISCAS".
 *
 * Sincroniza cada linha (nova ou editada) da aba "Leads" com o CRM,
 * chamando /api/crm/sheets-sync no site.
 *
 * Como instalar:
 * 1. Na planilha, abra Extensões > Apps Script.
 * 2. Cole este arquivo no editor (substitua o Code.gs padrão) e salve.
 * 3. Clique no ícone de engrenagem (Configurações do projeto) > Propriedades
 *    do script > Adicionar propriedade do script. Nome: CRM_SECRET.
 *    Valor: o mesmo de SHEETS_TO_CRM_SECRET no ambiente do site (não
 *    commitar esse valor em lugar nenhum do código).
 * 4. Na barra lateral, clique no relógio (Acionadores) > Adicionar acionador.
 *    Função a executar: aoEditarLinha
 *    Evento: Do Google Sheets > Ao editar
 *    Salve e autorize o script quando o Google pedir.
 * 5. (Opcional) Recarregue a planilha, abra o menu "CRM ISCAS" que aparece
 *    e clique em "Sincronizar tudo agora" para importar as linhas que já
 *    existiam antes de instalar o acionador.
 */

const CRM_ENDPOINT_URL = "https://mensortreinamentos.com.br/api/crm/sheets-sync";
const SHEET_NAME = "Leads";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CRM ISCAS")
    .addItem("Sincronizar tudo agora", "sincronizarTodasAsLinhas")
    .addToUi();
}

function aoEditarLinha(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  const primeiraLinha = Math.max(2, range.getRow());
  const ultimaLinha = range.getRow() + range.getNumRows() - 1;
  for (let linha = primeiraLinha; linha <= ultimaLinha; linha++) {
    enviarLinha(sheet, linha);
  }
}

function sincronizarTodasAsLinhas() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const ultimaLinha = sheet.getLastRow();
  for (let linha = 2; linha <= ultimaLinha; linha++) {
    enviarLinha(sheet, linha);
  }
  SpreadsheetApp.getUi().alert("Sincronização concluída até a linha " + ultimaLinha + ".");
}

function enviarLinha(sheet, linha) {
  const segredo = PropertiesService.getScriptProperties().getProperty("CRM_SECRET");
  if (!segredo) {
    Logger.log("CRM_SECRET não configurado em Configurações do projeto > Propriedades do script.");
    return;
  }

  const valores = sheet.getRange(linha, 1, 1, 7).getValues()[0];
  const [username, oficina, celular, pessoas, funil, faturamento, problema] = valores;

  const payload = {
    rowNumber: linha,
    username: String(username || ""),
    oficina: String(oficina || ""),
    celular: String(celular || ""),
    pessoas: String(pessoas || ""),
    funil: String(funil || ""),
    faturamento: String(faturamento || ""),
    problema: String(problema || ""),
  };

  const resposta = UrlFetchApp.fetch(CRM_ENDPOINT_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: { Authorization: "Bearer " + segredo },
    muteHttpExceptions: true,
  });

  if (resposta.getResponseCode() !== 200) {
    Logger.log("Falha ao sincronizar linha " + linha + ": " + resposta.getContentText());
  }
}
