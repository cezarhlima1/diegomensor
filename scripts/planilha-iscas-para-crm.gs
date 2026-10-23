/**
 * Planilha Automações de cadastro ISCAS, aba Leads (colunas A:G):
 * username, oficina, celular, pessoas, funil, faturamento, problema.
 * CRM_APLICACAO_ID identifica cada aplicação e acompanha a linha ao ordenar.
 * Não apague nem reutilize esse ID em novas aplicações.
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
    .addItem("Sincronizar tudo agora", "sincronizarTodasAsLinhas")
    .addItem("Ver resultado da sincronização", "verResultadoSincronizacao").addToUi();
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

function verResultadoSincronizacao() {
  const props = PropertiesService.getScriptProperties();
  SpreadsheetApp.getUi().alert((props.getProperty("CRM_LAST_RESULT") || "Nenhuma sincronização executada.") +
    "\n\n" + (props.getProperty("CRM_LAST_ERRORS") || ""));
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
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    let idColumn = headers.indexOf("CRM_APLICACAO_ID") + 1;
    if (!idColumn) {
      idColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, idColumn).setValue("CRM_APLICACAO_ID");
    }
    const rows = sheet.getRange(2, 1, count, 7).getDisplayValues();
    const dateColumn = headers.findIndex(function(value) { return String(value).trim().toUpperCase() === "DATA"; }) + 1;
    const dates = dateColumn ? sheet.getRange(2, dateColumn, count, 1).getDisplayValues() : [];
    const ids = sheet.getRange(2, idColumn, count, 1).getDisplayValues();
    if (!state.CRM_ID_BASELINE_INITIALIZED) {
      const initialProperties = { CRM_ID_BASELINE_INITIALIZED: "true" };
      const initialIds = {};
      rows.forEach(function(values, index) {
        if (values.every(function(value) { return !value.trim(); })) return;
        let id = String(ids[index][0] || "").trim();
        if (!id || initialIds[id]) id = Utilities.getUuid();
        initialIds[id] = true;
        ids[index][0] = id;
        initialProperties["CRM_BASELINE_" + id] = "true";
      });
      sheet.getRange(2, idColumn, count, 1).setValues(ids);
      props.setProperties(initialProperties);
      Object.assign(state, initialProperties);
    }
    const idOwners = {};
    ids.forEach(function(row, index) {
      const id = String(row[0] || "").trim();
      if (id && !Object.prototype.hasOwnProperty.call(idOwners, id)) idOwners[id] = index;
    });
    const start = Math.min(Number(state.CRM_CURSOR) || 0, count - 1);
    const deadline = Date.now() + 240000;
    let sent = 0, failed = 0, scanned = 0;
    const errors = [];
    for (; scanned < count && Date.now() < deadline; scanned++) {
      const index = (start + scanned) % count;
      const values = rows[index];
      if (values.every(function(value) { return !value.trim(); })) continue;
      let applicationId = String(ids[index][0] || "").trim();
      if (!applicationId || idOwners[applicationId] !== index) {
        applicationId = Utilities.getUuid();
        sheet.getRange(index + 2, idColumn).setValue(applicationId);
        idOwners[applicationId] = index;
      }
      const sheetDate = dates[index] ? String(dates[index][0] || "").trim() : "";
      const hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify([applicationId, values, sheetDate])));
      const key = "CRM_APPLICATION_" + applicationId;
      if (state[key] === hash) continue;
      const payload = { sheetDate: sheetDate, applicationId: applicationId, baseline: state["CRM_BASELINE_" + applicationId] === "true", spreadsheetId: spreadsheet.getId(), sheetId: sheet.getSheetId(), rowNumber: index + 2, username: values[0], oficina: values[1], celular: values[2], pessoas: values[3], funil: values[4], faturamento: values[5], problema: values[6] };
      try {
        const response = UrlFetchApp.fetch(CRM_ENDPOINT_URL, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), headers: { Authorization: "Bearer " + state.CRM_SECRET }, muteHttpExceptions: true });
        const code = response.getResponseCode();
        if (code !== 200 || JSON.parse(response.getContentText()).ok !== true) {
          failed++;
          if (errors.length < 10) errors.push("Linha " + (index + 2) + ": HTTP " + code);
          console.error("Falha na linha " + (index + 2) + ": HTTP " + code);
          // Stop global failures, but keep invalid/incomplete rows pending.
          if (code === 401 || code === 404 || code >= 500) break;
          continue;
        }
        props.setProperty(key, hash);
        sent++;
      } catch (error) {
        failed++;
        if (errors.length < 10) errors.push("Linha " + (index + 2) + ": não foi possível confirmar o envio.");
        console.error("Falha na linha " + (index + 2) + ". Será tentada novamente.");
        break;
      }
    }
    props.setProperty("CRM_CURSOR", String((start + scanned) % count));
    const status = sent + " linha(s) enviada(s); " + failed + " falha(s). Linhas pendentes serão tentadas na próxima execução.";
    props.setProperty("CRM_LAST_RUN", new Date().toISOString());
    props.setProperty("CRM_LAST_RESULT", status);
    props.setProperty("CRM_LAST_ERRORS", errors.join("\n"));
    if (failed) throw new Error(status);
    return status;
  } finally {
    lock.releaseLock();
  }
}
