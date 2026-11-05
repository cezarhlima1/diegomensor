export type ContactSummaryLead = {
  id: string; name: string; company: string; phone: string; stage: string;
  product?: string; nextAction: string; followUpAt?: string | null;
  contactCheckpoints?: string[]; tags?: string[];
};
export const normalizedStage = (stage: string) => stage.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const isFollowUpStage = (stage: string) => normalizedStage(stage).includes('followup');
export const isReturnStage = (stage: string) => normalizedStage(stage).includes('retorno');
export const isOpenContact = (lead: ContactSummaryLead) => !['fechado', 'naofechou', 'desqualificado'].includes(normalizedStage(lead.stage));
export const phoneEnding = (phone: string) => phone.replace(/\D/g, '').slice(-4);
export const contactDay = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export const contactedOn = (lead: ContactSummaryLead, day: string) => (lead.contactCheckpoints || []).some(value => !Number.isNaN(Date.parse(value)) && contactDay(value) === day);
export function contactSummaryRows<T extends ContactSummaryLead>(leads: T[], mode: 'followups' | 'returns', day: string): T[] {
  return leads.filter(lead => isOpenContact(lead) && (mode === 'followups' ? isFollowUpStage(lead.stage) : Boolean(lead.followUpAt) && !Number.isNaN(Date.parse(lead.followUpAt!)))).sort((a, b) => {
    if (mode === 'followups') {
      const done = Number(contactedOn(a, day)) - Number(contactedOn(b, day));
      if (done) return done;
    }
    const date = (lead: T) => lead.followUpAt && !Number.isNaN(Date.parse(lead.followUpAt)) ? Date.parse(lead.followUpAt) : Infinity;
    return (date(a) - date(b) || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
  });
}

export function matchesContactListFilters(lead: ContactSummaryLead, search: string, tags: string[]) {
  if (tags.length && !tags.some(tag => lead.tags?.includes(tag))) return false;
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const query = normalize(search);
  if (!query) return true;
  const content = normalize([lead.name, lead.company, lead.phone, lead.product, lead.nextAction, ...(lead.tags || [])].filter(Boolean).join(' '));
  const phoneQuery = /^[\d\s()+.-]+$/.test(query) ? query.replace(/\D/g, '') : '';
  return content.includes(query) || (!!phoneQuery && lead.phone.replace(/\D/g, '').includes(phoneQuery));
}
