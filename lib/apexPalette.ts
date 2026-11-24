import type { DashboardSummary } from "@/lib/types";

export type ApexStatKey =
  | "pending_setup_payments"
  | "pending_quarterly_payments"
  | "unread_feedback"
  | "setup_pending_tenants"
  | "suspended_tenants"
  | "banned_tenants"
  | "inactive_tenants"
  | "disabled_users"
  | "pending_ops_mode_requests";

export const APEX_STAT_STYLES: Record<
  ApexStatKey,
  { accent: string; topBar: string; icon: string; value: string; card?: string }
> = {
  pending_setup_payments: {
    accent: "apex-stat-accent-gold",
    topBar: "apex-stat-topbar-gold",
    icon: "bg-[oklch(0.3_0.04_85)] text-[oklch(0.88_0.08_85)] ring-1 ring-[oklch(0.65_0.08_85/0.35)]",
    value: "text-[oklch(0.88_0.08_85)]",
  },
  pending_quarterly_payments: {
    accent: "apex-stat-accent-teal",
    topBar: "apex-stat-topbar-teal",
    icon: "bg-[oklch(0.28_0.04_160)] text-primary ring-1 ring-primary/35",
    value: "text-primary",
  },
  unread_feedback: {
    accent: "apex-stat-accent-teal",
    topBar: "apex-stat-topbar-teal",
    icon: "bg-[oklch(0.28_0.04_195)] text-[oklch(0.85_0.06_195)] ring-1 ring-[oklch(0.55_0.1_195/0.3)]",
    value: "text-[oklch(0.85_0.06_195)]",
  },
  setup_pending_tenants: {
    accent: "apex-stat-accent-gold",
    topBar: "apex-stat-topbar-gold",
    icon: "bg-[oklch(0.3_0.04_85)] text-[oklch(0.88_0.08_85)] ring-1 ring-[oklch(0.65_0.08_85/0.35)]",
    value: "text-[oklch(0.88_0.08_85)]",
  },
  suspended_tenants: {
    accent: "apex-stat-accent-warning",
    topBar: "apex-stat-topbar-amber",
    icon: "bg-[oklch(0.28_0.05_55)] text-[oklch(0.85_0.1_55)] ring-1 ring-[oklch(0.7_0.12_55/0.3)]",
    value: "text-[oklch(0.85_0.1_55)]",
  },
  banned_tenants: {
    accent: "apex-stat-accent-danger",
    topBar: "apex-stat-topbar-danger",
    icon: "bg-[oklch(0.28_0.06_25)] text-[oklch(0.78_0.14_25)] ring-1 ring-[oklch(0.6_0.14_25/0.35)]",
    value: "text-[oklch(0.78_0.14_25)]",
  },
  inactive_tenants: {
    accent: "apex-stat-accent-warning",
    topBar: "apex-stat-topbar-amber",
    icon: "bg-[oklch(0.28_0.05_55)] text-[oklch(0.85_0.1_55)] ring-1 ring-[oklch(0.7_0.12_55/0.3)]",
    value: "text-[oklch(0.85_0.1_55)]",
  },
  disabled_users: {
    accent: "apex-stat-accent-violet",
    topBar: "apex-stat-topbar-violet",
    icon: "bg-[oklch(0.28_0.05_300)] text-[oklch(0.82_0.1_300)] ring-1 ring-[oklch(0.6_0.1_300/0.3)]",
    value: "text-[oklch(0.82_0.1_300)]",
  },
  pending_ops_mode_requests: {
    accent: "apex-stat-accent-violet",
    topBar: "apex-stat-topbar-violet",
    icon: "bg-[oklch(0.28_0.05_300)] text-[oklch(0.82_0.1_300)] ring-1 ring-[oklch(0.6_0.1_300/0.3)]",
    value: "text-[oklch(0.82_0.1_300)]",
  },
};

export function summaryValue(summary: DashboardSummary, key: ApexStatKey): number {
  const v = summary[key];
  return typeof v === "number" ? v : 0;
}
