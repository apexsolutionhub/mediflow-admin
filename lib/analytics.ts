import type {
  AuditLogRow,
  DashboardSummary,
  FeedbackDirectoryRow,
  Tenant,
} from "@/lib/types";
import { computeTenantPortfolioMetrics } from "@/lib/overviewMetrics";

export type ChartSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type MonthlyGrowthPoint = {
  month: string;
  label: string;
  count: number;
  cumulative: number;
};

export type IssueCategory = {
  key: string;
  label: string;
  count: number;
  severity: "critical" | "warning" | "info";
  href: string;
  description: string;
};

export type RevenueEstimate = {
  quarterlyRecurringETB: number;
  setupPipelineETB: number;
  activeTenants: number;
  avgQuarterlyFeeETB: number;
};

export const CHART_COLORS = {
  teal: "oklch(0.62 0.12 195)",
  gold: "oklch(0.72 0.08 85)",
  violet: "oklch(0.62 0.1 300)",
  emerald: "oklch(0.62 0.14 155)",
  amber: "oklch(0.72 0.12 75)",
  danger: "oklch(0.65 0.18 25)",
  sky: "oklch(0.65 0.12 230)",
  slate: "oklch(0.55 0.02 265)",
} as const;

const SUBSCRIPTION_COLORS: Record<string, string> = {
  active: CHART_COLORS.emerald,
  trial: CHART_COLORS.gold,
  exempt: CHART_COLORS.slate,
  warning: CHART_COLORS.amber,
  grace: CHART_COLORS.amber,
  expired: CHART_COLORS.danger,
  on_hold: CHART_COLORS.violet,
  setup_pending: CHART_COLORS.sky,
  pending_approval: CHART_COLORS.teal,
  rejected: CHART_COLORS.danger,
  trial_expired: CHART_COLORS.danger,
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  setup_pending: "Setup pending",
  pending_approval: "Payment pending",
  rejected: "Setup rejected",
  active: "Active",
  warning: "Renewal soon",
  grace: "Grace period",
  expired: "Expired",
  on_hold: "Billing hold",
  trial: "Free trial",
  trial_expired: "Trial expired",
  exempt: "Exempt",
};

const ACCOUNT_LABELS: Record<string, string> = {
  active: "Active",
  suspended: "Suspended",
  banned: "Banned",
  deleted: "Deleted",
};

export function deriveSubscriptionStatus(tenant: Tenant): string {
  if (tenant.is_illustration) return "exempt";
  if (tenant.billing_hold) return "on_hold";

  const now = Date.now();

  if (!tenant.setup_fee_approved) {
    const setupReview =
      tenant.setup_review_status ||
      (tenant.payments?.some(
        (payment) => payment.payment_kind === "setup" && payment.status === "rejected",
      )
        ? "rejected"
        : undefined);
    if (setupReview === "rejected") return "rejected";
    if (tenant.free_trial_ends_at) {
      const trialEnd = new Date(tenant.free_trial_ends_at).getTime();
      if (!Number.isNaN(trialEnd) && trialEnd < now) return "trial_expired";
      return "trial";
    }
    return "setup_pending";
  }

  if (!tenant.subscription_payment_approved) return "pending_approval";

  if (tenant.subscription_paid_until) {
    const paidUntil = new Date(tenant.subscription_paid_until).getTime();
    if (!Number.isNaN(paidUntil)) {
      if (paidUntil < now) {
        return tenant.account_status === "active" ? "grace" : "expired";
      }
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (paidUntil - now <= sevenDays) return "warning";
    }
  }

  if (tenant.account_status === "active") return "active";
  return "expired";
}

export function aggregateSubscriptionStatus(tenants: Tenant[]): ChartSlice[] {
  const counts = new Map<string, number>();
  for (const tenant of tenants) {
    const key = deriveSubscriptionStatus(tenant);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: SUBSCRIPTION_LABELS[key] ?? key,
      value,
      color: SUBSCRIPTION_COLORS[key] ?? CHART_COLORS.slate,
    }))
    .sort((a, b) => b.value - a.value);
}

export function aggregateAccountStatus(tenants: Tenant[]): ChartSlice[] {
  const counts = new Map<string, number>();
  for (const tenant of tenants) {
    const key = tenant.account_status || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: ACCOUNT_LABELS[key] ?? key,
      value,
      color:
        key === "active"
          ? CHART_COLORS.emerald
          : key === "suspended"
            ? CHART_COLORS.amber
            : CHART_COLORS.danger,
    }))
    .sort((a, b) => b.value - a.value);
}

export function aggregateTenantGrowth(tenants: Tenant[]): MonthlyGrowthPoint[] {
  const byMonth = new Map<string, number>();
  for (const tenant of tenants) {
    if (!tenant.created_at) continue;
    const d = new Date(tenant.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  return sorted.map(([month, count]) => {
    cumulative += count;
    const [y, m] = month.split("-");
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    return { month, label, count, cumulative };
  });
}

export function estimateRevenue(tenants: Tenant[]): RevenueEstimate {
  const paying = tenants.filter(
    (t) =>
      deriveSubscriptionStatus(t) === "active" ||
      deriveSubscriptionStatus(t) === "warning" ||
      deriveSubscriptionStatus(t) === "trial" ||
      deriveSubscriptionStatus(t) === "exempt",
  );
  const setupPipeline = tenants.filter(
    (t) => !t.setup_fee_approved || deriveSubscriptionStatus(t) === "setup_pending",
  );

  const quarterlyRecurringETB = paying.reduce((sum, t) => sum + (t.quarterly_fee_etb || 0), 0);
  const setupPipelineETB = setupPipeline.reduce((sum, t) => sum + (t.setup_fee_etb || 0), 0);

  return {
    quarterlyRecurringETB,
    setupPipelineETB,
    activeTenants: paying.length,
    avgQuarterlyFeeETB:
      paying.length > 0 ? Math.round(quarterlyRecurringETB / paying.length) : 0,
  };
}

function issueSeverity(
  condition: boolean,
  whenTrue: IssueCategory["severity"],
  whenFalse: IssueCategory["severity"] = "info",
): IssueCategory["severity"] {
  return condition ? whenTrue : whenFalse;
}

export function buildIssueCategories(
  tenants: Tenant[],
  summary: DashboardSummary,
): IssueCategory[] {
  const metrics = computeTenantPortfolioMetrics(tenants);
  const billingHold = tenants.filter((t) => t.billing_hold).length;
  const graceExpired = tenants.filter((t) => {
    const status = deriveSubscriptionStatus(t);
    return status === "grace" || status === "expired";
  }).length;
  const setupPending = tenants.filter((t) => deriveSubscriptionStatus(t) === "setup_pending").length;
  const paymentPending = tenants.filter(
    (t) => deriveSubscriptionStatus(t) === "pending_approval",
  ).length;

  const categories: IssueCategory[] = [
    {
      key: "billing",
      label: "Billing at risk",
      count: billingHold + graceExpired + metrics.graceExpired,
      severity: issueSeverity(billingHold + graceExpired > 0, "critical"),
      href: "/tenants",
      description: "Billing holds, grace periods, and expired subscriptions",
    },
    {
      key: "onboarding",
      label: "Onboarding backlog",
      count: setupPending + (summary.setup_pending_tenants || 0),
      severity: issueSeverity(setupPending > 0, "warning"),
      href: "/signups",
      description: "Clinics waiting for setup approval or fee payment",
    },
    {
      key: "payments",
      label: "Payment queues",
      count: summary.pending_setup_payments + summary.pending_quarterly_payments,
      severity: "warning",
      href: "/payments/setup",
      description: "Setup and quarterly payments awaiting approval",
    },
    {
      key: "accounts",
      label: "Account restrictions",
      count: (summary.suspended_tenants || 0) + (summary.banned_tenants || 0),
      severity: issueSeverity(
        (summary.suspended_tenants || 0) + (summary.banned_tenants || 0) > 0,
        "critical",
      ),
      href: "/tenants",
      description: "Suspended or banned clinics",
    },
    {
      key: "communication",
      label: "Unread clinic chat",
      count: summary.unread_feedback || 0,
      severity: issueSeverity((summary.unread_feedback || 0) > 0, "warning"),
      href: "/feedback",
      description: "Clinics waiting for a reply in clinic chat",
    },
    {
      key: "users",
      label: "Disabled logins",
      count: summary.disabled_users || 0,
      severity: issueSeverity((summary.disabled_users || 0) > 0, "warning"),
      href: "/users",
      description: "Tenant staff accounts with login disabled",
    },
    {
      key: "trials",
      label: "Trial deadlines",
      count: metrics.trialsEnding7d + metrics.trialExpiredAwaitingSetup,
      severity: issueSeverity(metrics.trialExpiredAwaitingSetup > 0, "critical"),
      href: "/tenants",
      description: "Trials ending within 7 days or already expired",
    },
    {
      key: "payment-pending",
      label: "Awaiting payment proof",
      count: paymentPending,
      severity: issueSeverity(paymentPending > 0, "warning"),
      href: "/payments/setup",
      description: "Clinics with subscription payment pending approval",
    },
  ];
  return categories.filter((c) => c.count > 0);
}

export function computePortfolioHealthScore(
  summary: DashboardSummary,
  tenants: Tenant[],
): { score: number; grade: string; label: string } {
  if (summary.tenants_total === 0) {
    return { score: 100, grade: "A", label: "No clinics yet" };
  }

  const activeHealthy = tenants.filter(
    (t) =>
      t.account_status === "active" &&
      (deriveSubscriptionStatus(t) === "active" ||
        deriveSubscriptionStatus(t) === "trial" ||
        deriveSubscriptionStatus(t) === "exempt"),
  ).length;

  const healthyRatio = tenants.length > 0 ? activeHealthy / tenants.length : 0.85;
  return finalizeHealthScore(summary, healthyRatio, tenants);
}

function finalizeHealthScore(summary: DashboardSummary, healthyRatio: number, tenants: Tenant[]) {
  const metrics = computeTenantPortfolioMetrics(tenants);
  const issueWeight =
    summary.pending_setup_payments +
    summary.pending_quarterly_payments +
    (summary.unread_feedback || 0) +
    (summary.suspended_tenants || 0) * 3 +
    (summary.banned_tenants || 0) * 5 +
    metrics.graceExpired * 2 +
    metrics.billingHold * 2;

  const issuePenalty = Math.min(40, issueWeight * 1.8);
  const raw = Math.round(healthyRatio * 60 + 40 - issuePenalty);
  const score = Math.max(0, Math.min(100, raw));

  if (score >= 90) return { score, grade: "A", label: "Excellent" };
  if (score >= 75) return { score, grade: "B", label: "Healthy" };
  if (score >= 60) return { score, grade: "C", label: "Needs attention" };
  if (score >= 40) return { score, grade: "D", label: "At risk" };
  return { score, grade: "F", label: "Critical" };
}

export function aggregateAuditActivity(logs: AuditLogRow[]): ChartSlice[] {
  const byDay = new Map<string, number>();
  for (const log of logs) {
    const d = new Date(log.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .map(([key, value], i) => ({
      key,
      label: key,
      value,
      color: i % 2 === 0 ? CHART_COLORS.teal : CHART_COLORS.gold,
    }))
    .slice(-14);
}

export function aggregateFeedbackActivity(threads: FeedbackDirectoryRow[]): {
  open: number;
  closed: number;
  unread: number;
} {
  let open = 0;
  let closed = 0;
  let unread = 0;
  for (const row of threads) {
    if (!row.thread_id) continue;
    if (row.thread_status === "open" || row.thread_status === "active") open++;
    else closed++;
    unread += row.unread_count ?? 0;
  }
  return { open, closed, unread };
}

export function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString("en-ET")}`;
}
