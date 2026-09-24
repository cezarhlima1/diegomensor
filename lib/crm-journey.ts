import { contactDay } from './crm-contact-summary';

export type JourneyEvent = { id: string; kind: 'stage' | 'return-completed' | 'no-show'; at: string; scheduledFor?: string | null; stage?: string };
type JourneyLead = { stage: string; contactCheckpoints?: string[]; journeyHistory?: JourneyEvent[]; followUpAt?: string | null; meetingScheduledFor?: string | null; meetingOutcome?: string | null };
export function markContact<T extends JourneyLead>(lead: T, now: string): T {
  const checkpoints = lead.contactCheckpoints || [];
  return { ...lead, contactCheckpoints: checkpoints.some(at => contactDay(at) === contactDay(now)) ? checkpoints : [...checkpoints, now] };
}
function append<T extends JourneyLead>(lead: T, event: JourneyEvent): T {
  const history = lead.journeyHistory || [];
  return { ...lead, journeyHistory: history.some(item => item.id === event.id) ? history : [...history, event] };
}
export function recordJourney<T extends JourneyLead>(previous: T, updated: T, now = new Date().toISOString()): T {
  let next = updated;
  if (previous.stage !== updated.stage) {
    next = markContact(append(next, { id: `stage:${now}:${updated.stage}`, kind: 'stage', at: now, stage: updated.stage }), now);
  }
  if (updated.meetingOutcome === 'No-show' && previous.meetingOutcome !== 'No-show') {
    const scheduledFor = updated.meetingScheduledFor || null;
    next = append(next, { id: `no-show:${scheduledFor || now}`, kind: 'no-show', at: now, scheduledFor });
  }
  return next;
}
export function completeReturn<T extends JourneyLead>(lead: T, now = new Date().toISOString()): T {
  if (!lead.followUpAt) return lead;
  return markContact(append({ ...lead, followUpAt: null }, { id: `return:${lead.followUpAt}:${now}`, kind: 'return-completed', at: now, scheduledFor: lead.followUpAt }), now);
}
