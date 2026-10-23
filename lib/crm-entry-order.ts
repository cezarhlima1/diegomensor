export type EntryAudit = { status: "confirmed" | "review"; entryAt?: string | null; reasons?: string[]; checkedAt?: string; evidence?: unknown };
type EntryLead = { id: string; createdAt?: string; application?: { entryAudit?: EntryAudit; sheetDate?: string | null; sessionId?: string; sheetsIscas?: unknown; submittedAt?: string } };

export function newLeadEntryTime(lead: EntryLead) {
  const application = lead.application;
  if (application?.entryAudit) return application.entryAudit.status === "confirmed" ? Date.parse(application.entryAudit.entryAt || "") || 0 : 0;
  // A spreadsheet sync's submittedAt is a receipt time, not proof of a new application.
  if (application?.sheetsIscas) return 0;
  return Date.parse(lead.createdAt || application?.submittedAt || "") || 0;
}

export function compareNewLeadEntries(left: EntryLead, right: EntryLead) {
  return newLeadEntryTime(right) - newLeadEntryTime(left) || left.id.localeCompare(right.id);
}
