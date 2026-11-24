import { CHART_COLORS, deriveSubscriptionStatus, type ChartSlice } from "@/lib/analytics";
import type { PaymentSubmission, Tenant, TenantStaff } from "@/lib/types";

export type TenantPaymentTrendPoint = {
  key: string;
  label: string;
  amount: number;
  count: number;
};

export type TenantReportingKpis = {
  collectedETB: number;
  pendingETB: number;
  rejectedETB: number;
  paymentCount: number;
  activeStaff: number;
  disabledStaff: number;
  renewalFeeETB: number;
  renewalLabel: string;
  paidUntilLabel: string;
  healthScore: number;
  healthLabel: string;
};

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  if (!y || !m) return key;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function buildTenantReportingKpis(
  tenant: Tenant,
  payments: PaymentSubmission[],
): TenantReportingKpis {
  const renewalFeeETB = Number(tenant.quarterly_fee_etb) || 0;

  let collectedETB = 0;
  let pendingETB = 0;
  let rejectedETB = 0;
  for (const p of payments) {
    const amount = Number(p.amount_etb) || 0;
    const status = String(p.status || "").toLowerCase();
    if (status === "approved" || status === "paid") collectedETB += amount;
    else if (status === "pending") pendingETB += amount;
    else if (status === "rejected") rejectedETB += amount;
  }

  const staff = tenant.staff ?? [];
  const activeStaff = staff.filter((u) => !u.login_disabled).length;
  const disabledStaff = staff.filter((u) => u.login_disabled).length;

  let healthScore = 72;
  const sub = deriveSubscriptionStatus(tenant);
  if (sub === "active") healthScore += 18;
  else if (sub === "warning" || sub === "trial") healthScore += 8;
  else if (sub === "grace") healthScore -= 8;
  else if (sub === "expired" || sub === "on_hold") healthScore -= 22;
  else if (sub === "setup_pending" || sub === "pending_approval") healthScore -= 10;

  const account = String(tenant.account_status || "").toLowerCase();
  if (account === "suspended") healthScore -= 25;
  if (account === "banned") healthScore -= 40;
  if (tenant.billing_hold) healthScore -= 12;
  if (disabledStaff > 0) healthScore -= Math.min(12, disabledStaff * 4);
  if (tenant.is_illustration || sub === "exempt") healthScore = Math.min(healthScore, 55);

  healthScore = Math.max(5, Math.min(100, healthScore));

  let healthLabel = "Stable";
  if (healthScore >= 85) healthLabel = "Healthy";
  else if (healthScore >= 65) healthLabel = "Stable";
  else if (healthScore >= 45) healthLabel = "Needs attention";
  else healthLabel = "At risk";

  return {
    collectedETB,
    pendingETB,
    rejectedETB,
    paymentCount: payments.length,
    activeStaff,
    disabledStaff,
    renewalFeeETB,
    renewalLabel: "Quarterly fee",
    paidUntilLabel: tenant.subscription_paid_until
      ? new Date(tenant.subscription_paid_until).toLocaleDateString()
      : "Not set",
    healthScore,
    healthLabel,
  };
}

export function aggregateTenantPaymentTrend(
  payments: PaymentSubmission[],
): TenantPaymentTrendPoint[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const p of payments) {
    const key = monthKey(p.submitted_at);
    if (key === "unknown") continue;
    const prev = map.get(key) ?? { amount: 0, count: 0 };
    prev.amount += Number(p.amount_etb) || 0;
    prev.count += 1;
    map.set(key, prev);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, v]) => ({
      key,
      label: monthLabel(key),
      amount: Math.round(v.amount),
      count: v.count,
    }));
}

export function aggregateTenantPaymentStatus(payments: PaymentSubmission[]): ChartSlice[] {
  const buckets = { approved: 0, pending: 0, rejected: 0, other: 0 };
  for (const p of payments) {
    const status = String(p.status || "").toLowerCase();
    if (status === "approved" || status === "paid") buckets.approved += 1;
    else if (status === "pending") buckets.pending += 1;
    else if (status === "rejected") buckets.rejected += 1;
    else buckets.other += 1;
  }
  return [
    { key: "approved", label: "Approved", value: buckets.approved, color: CHART_COLORS.emerald },
    { key: "pending", label: "Pending", value: buckets.pending, color: CHART_COLORS.amber },
    { key: "rejected", label: "Rejected", value: buckets.rejected, color: CHART_COLORS.danger },
    { key: "other", label: "Other", value: buckets.other, color: CHART_COLORS.slate },
  ].filter((s) => s.value > 0);
}

export function aggregateTenantPaymentKinds(payments: PaymentSubmission[]): ChartSlice[] {
  const map = new Map<string, number>();
  for (const p of payments) {
    const kind = String(p.payment_kind || "other").toLowerCase();
    map.set(kind, (map.get(kind) ?? 0) + 1);
  }
  const colors: Record<string, string> = {
    setup: CHART_COLORS.gold,
    quarterly: CHART_COLORS.teal,
  };
  const labels: Record<string, string> = {
    setup: "Setup",
    quarterly: "Quarterly",
  };
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
      color: colors[key] ?? CHART_COLORS.sky,
    }))
    .sort((a, b) => b.value - a.value);
}

function titleCaseRole(role: string) {
  return role
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function aggregateTenantStaffRoles(staff: TenantStaff[]): ChartSlice[] {
  const map = new Map<string, number>();
  for (const u of staff) {
    const raw = String(u.role || "Unassigned").trim() || "Unassigned";
    const role = titleCaseRole(raw);
    map.set(role, (map.get(role) ?? 0) + 1);
  }
  const palette = [
    CHART_COLORS.teal,
    CHART_COLORS.gold,
    CHART_COLORS.violet,
    CHART_COLORS.emerald,
    CHART_COLORS.sky,
    CHART_COLORS.amber,
    CHART_COLORS.slate,
  ];
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, value], i) => ({
      key: label,
      label,
      value,
      color: palette[i % palette.length],
    }));
}

export function aggregateTenantStaffBars(tenant: Tenant): { label: string; value: number; color: string }[] {
  return [
    { label: "Staff", value: tenant.staff_count ?? tenant.staff?.length ?? 0, color: CHART_COLORS.teal },
    { label: "Managers", value: tenant.manager_count ?? 0, color: CHART_COLORS.gold },
    { label: "Staff", value: tenant.pharmacist_count ?? 0, color: CHART_COLORS.violet },
  ];
}
