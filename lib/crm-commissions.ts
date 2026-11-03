export type CommissionPolicy = {
  mode: 'fixed' | 'progressive';
  mentorshipProducts: string[];
  period: 'monthly' | 'lifetime';
  otherRate: number;
};
export const defaultCommissionPolicy = (): CommissionPolicy => ({ mode: 'fixed', mentorshipProducts: [], period: 'monthly', otherRate: 7 });
export function parseCommissionPolicy(value: unknown): CommissionPolicy {
  if (value == null) return defaultCommissionPolicy();
  if (typeof value !== 'object') throw Error('invalid-commission-policy');
  const item = value as Record<string, unknown>;
  if (item.mode !== 'fixed' && item.mode !== 'progressive') throw Error('invalid-commission-policy');
  if (item.mode === 'fixed') return defaultCommissionPolicy();
  const products = Array.isArray(item.mentorshipProducts) ? [...new Set(item.mentorshipProducts.filter((product): product is string => typeof product === 'string' && !!product.trim()).map(product => product.trim()))] : [];
  if (!products.length || !['monthly', 'lifetime'].includes(String(item.period)) || !Number.isFinite(item.otherRate) || Number(item.otherRate) < 0 || Number(item.otherRate) > 100) throw Error('invalid-commission-policy');
  return { mode: 'progressive', mentorshipProducts: products, period: item.period as CommissionPolicy['period'], otherRate: Number(item.otherRate) };
}
export function commissionForSale(policy: CommissionPolicy, product: string, previousMentorshipSales: number, fixedRate: number) {
  if (policy.mode === 'fixed') return fixedRate;
  if (!policy.mentorshipProducts.includes(product)) return policy.otherRate;
  return Math.min(10, Math.max(5, previousMentorshipSales + 1));
}
export const commissionPolicyKey = (closerId: string) => `closer_commission_policy:${closerId}`;
