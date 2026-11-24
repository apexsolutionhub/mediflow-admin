import type { DashboardSummary, Tenant } from "@/lib/types";

export type TenantPortfolioMetrics = {
  billingHold: number;
  trialsEnding7d: number;
  trialExpiredAwaitingSetup: number;
  graceExpired: number;
  newLast30Days: number;
  quarterlyMrr: number;
  payingPharmacies: number;
  totalStaff: number;
};

export function computeTenantPortfolioMetrics(tenants: Tenant[]): TenantPortfolioMetrics {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  let billingHold = 0;
  let trialsEnding7d = 0;
  let trialExpiredAwaitingSetup = 0;
  let graceExpired = 0;
  let newLast30Days = 0;
  let quarterlyMrr = 0;
  let payingPharmacies = 0;
  let totalStaff = 0;

  for (const tenant of tenants) {
    totalStaff += tenant.staff_count ?? 0;

    if (tenant.billing_hold) billingHold += 1;

    if (tenant.created_at) {
      const created = new Date(tenant.created_at).getTime();
      if (now - created <= thirtyDays) newLast30Days += 1;
    }

    if (tenant.free_trial_ends_at) {
      const trialEnd = new Date(tenant.free_trial_ends_at).getTime();
      if (trialEnd > now && trialEnd - now <= sevenDays) trialsEnding7d += 1;
      if (trialEnd < now && !tenant.setup_fee_approved) trialExpiredAwaitingSetup += 1;
    }

    if (tenant.subscription_paid_until) {
      const paidUntil = new Date(tenant.subscription_paid_until).getTime();
      if (paidUntil < now && tenant.account_status === "active") graceExpired += 1;
    }

    if (
      tenant.account_status === "active" &&
      tenant.subscription_payment_approved &&
      (tenant.quarterly_fee_etb ?? 0) > 0
    ) {
      quarterlyMrr += tenant.quarterly_fee_etb ?? 0;
      payingPharmacies += 1;
    }
  }

  return {
    billingHold,
    trialsEnding7d,
    trialExpiredAwaitingSetup,
    graceExpired,
    newLast30Days,
    quarterlyMrr,
    payingPharmacies,
    totalStaff,
  };
}

export function portfolioHealthScore(
  summary: DashboardSummary,
  metrics: TenantPortfolioMetrics,
): number {
  let score = 100;
  score -= summary.pending_setup_payments * 6;
  score -= summary.pending_quarterly_payments * 5;
  score -= (summary.unread_feedback || 0) * 3;
  score -= metrics.billingHold * 7;
  score -= (summary.suspended_tenants || 0) * 8;
  score -= (summary.banned_tenants || 0) * 10;
  score -= metrics.trialExpiredAwaitingSetup * 5;
  score -= metrics.graceExpired * 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function portfolioHealthLabel(score: number): string {
  if (score >= 85) return "Healthy";
  if (score >= 65) return "Stable";
  return "At risk";
}
