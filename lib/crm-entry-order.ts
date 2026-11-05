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

type ActiveLead = EntryLead & {
  lastActivityAt?: string;
  journeyHistory?: { kind: string; at: string }[];
  contactCheckpoints?: string[];
  conversationAt?: string; meetingAt?: string; proposalAt?: string; closedAt?: string;
};
export function leadActivityTime(lead: ActiveLead) {
  // Arrival is the baseline; a real interaction can bring an older lead up.
  // Database updated_at and future appointments are not activity timestamps.
  return Math.max(newLeadEntryTime(lead), Date.parse(lead.lastActivityAt || '') || 0,
    ...(lead.journeyHistory || []).map(event => Date.parse(event.at) || 0),
    ...(lead.contactCheckpoints || []).map(at => Date.parse(at) || 0),
    ...[lead.conversationAt, lead.meetingAt, lead.proposalAt, lead.closedAt].map(at => Date.parse(at || '') || 0));
}
export function compareLeadActivity(left: ActiveLead, right: ActiveLead) {
  return leadActivityTime(right) - leadActivityTime(left) || compareNewLeadEntries(left, right);
}
