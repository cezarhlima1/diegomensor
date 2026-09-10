/**
 * Planilha Automações de cadastro ISCAS, aba Leads (colunas A:G):
 * username, oficina, celular, pessoas, funil, faturamento, problema.
 * Substitua o script antigo por este. Mantenha CRM_SECRET nas propriedades
 * do script, igual a SHEETS_TO_CRM_SECRET no servidor. Execute instalarSincronizacao
 * uma vez e autorize. O relógio captura também inclusões feitas por API/scripts.
 * Nenhum segredo deve ser colocado neste arquivo.
 */
const CRM_ENDPOINT_URL = "https://www.mensortreinamentos.com.br/api/crm/sheets-sync";
const SHEET_NAME = "Leads";

function onOpen() {
  SpreadsheetApp.getUi().createMenu("CRM ISCAS")
    .addItem("Ativar sincronização automática", "instalarSincronizacao")
    .addItem("Sincronizar tudo agora", "sincronizarTodasAsLinhas").addToUi();
}

function instalarSincronizacao() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("CRM_SECRET")) throw new Error("Configure CRM_SECRET nas propriedades do script.");
  const spreadsheet = SpreadsheetApp.getActive();
  if (!spreadsheet.getSheetByName(SHEET_NAME)) throw new Error("Aba Leads não encontrada.");
  props.setProperty("CRM_SPREADSHEET_ID", spreadsheet.getId());
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (["sincronizarPendentes", "aoEditarLinha"].indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("sincronizarPendentes").timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger("aoEditarLinha").forSpreadsheet(spreadsheet).onEdit().create();
  sincronizarPendentes();
}

function aoEditarLinha(e) {
  if (e && e.range && e.range.getSheet().getName() === SHEET_NAME) sincronizarPendentes();
}

function sincronizarTodasAsLinhas() {
  const result = sincronizarPendentes();
  SpreadsheetApp.getUi().alert(result || "Já existe uma sincronização em execução.");
}

function sincronizarPendentes() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const state = props.getProperties();
    if (!state.CRM_SECRET) throw new Error("CRM_SECRET não configurado.");
    const spreadsheet = state.CRM_SPREADSHEET_ID ? SpreadsheetApp.openById(state.CRM_SPREADSHEET_ID) : SpreadsheetApp.getActive();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Aba Leads não encontrada.");
    const count = sheet.getLastRow() - 1;
    if (count <= 0) return "Nenhuma linha para sincronizar.";
    const rows = sheet.getRange(2, 1, count, 7).getDisplayValues();
    const start = Math.min(Number(state.CRM_CURSOR) || 0, count - 1);
    const deadline = Date.now() + 240000;
    let sent = 0, failed = 0, scanned = 0;
    for (; scanned < count && Date.now() < deadline; scanned++) {
      const index = (start + scanned) % count;
      const values = rows[index];
      if (values.every(function(value) { return !value.trim(); })) continue;
      const hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(values)));
      const key = "CRM_ROW_" + sheet.getSheetId() + "_" + (index + 2);
      if (state[key] === hash) continue;
      const payload = { rowNumber: index + 2, username: values[0], oficina: values[1], celular: values[2], pessoas: values[3], funil: values[4], faturamento: values[5], problema: values[6] };
      try {
        const response = UrlFetchApp.fetch(CRM_ENDPOINT_URL, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), headers: { Authorization: "Bearer " + state.CRM_SECRET }, muteHttpExceptions: true });
        const code = response.getResponseCode();
        if (code !== 200 || JSON.parse(response.getContentText()).ok !== true) {
          failed++;
          console.error("Falha na linha " + (index + 2) + ": HTTP " + code);
          // Stop global failures, but keep invalid/incomplete rows pending.
          if (code === 401 || code === 404 || code >= 500) break;
          continue;
        }
        props.setProperty(key, hash);
        sent++;
      } catch (error) {
        failed++;
        console.error("Falha na linha " + (index + 2) + ". Será tentada novamente.");
        break;
      }
    }
    props.setProperty("CRM_CURSOR", String((start + scanned) % count));
    const status = sent + " linha(s) enviada(s); " + failed + " falha(s). Linhas pendentes serão tentadas na próxima execução.";
    props.setProperty("CRM_LAST_RUN", new Date().toISOString());
    props.setProperty("CRM_LAST_RESULT", status);
    if (failed) throw new Error(status);
    return status;
  } finally {
    lock.releaseLock();
  }
}
