import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Clock,
  CreditCard,
  MessageCircle,
  PauseCircle,
  Server,
  UserPlus,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/types";
import type { TenantPortfolioMetrics } from "@/lib/overviewMetrics";
import { APEX_STAT_STYLES, summaryValue, type ApexStatKey } from "@/lib/apexPalette";

type StatItem = {
  key: string;
  title: string;
  href?: string;
  icon: typeof UserPlus;
  value: number;
  styleKey: ApexStatKey;
};

function buildStats(
  summary: DashboardSummary,
  metrics: TenantPortfolioMetrics,
): StatItem[] {
  return [
    {
      key: "pending_setup_payments",
      title: "Setup payments",
      href: "/payments/setup",
      icon: UserPlus,
      value: summaryValue(summary, "pending_setup_payments"),
      styleKey: "pending_setup_payments",
    },
    {
      key: "pending_quarterly_payments",
      title: "Quarterly payments",
      href: "/payments/quarterly",
      icon: CreditCard,
      value: summaryValue(summary, "pending_quarterly_payments"),
      styleKey: "pending_quarterly_payments",
    },
    {
      key: "unread_feedback",
      title: "Unread chats",
      href: "/feedback",
      icon: MessageCircle,
      value: summaryValue(summary, "unread_feedback"),
      styleKey: "unread_feedback",
    },
    {
      key: "pending_ops_mode_requests",
      title: "Ops mode requests",
      href: "/ops-mode-requests",
      icon: Server,
      value: summaryValue(summary, "pending_ops_mode_requests"),
      styleKey: "pending_ops_mode_requests",
    },
    {
      key: "setup_pending_tenants",
      title: "Setup not approved",
      href: "/signups",
      icon: Users,
      value: summaryValue(summary, "setup_pending_tenants"),
      styleKey: "setup_pending_tenants",
    },
    {
      key: "billing_hold",
      title: "Billing hold",
      href: "/tenants",
      icon: PauseCircle,
      value: metrics.billingHold,
      styleKey: "suspended_tenants",
    },
    {
      key: "grace_expired",
      title: "Grace / expired",
      href: "/tenants",
      icon: Clock,
      value: metrics.graceExpired,
      styleKey: "inactive_tenants",
    },
    {
      key: "trials_ending",
      title: "Trials ending (7d)",
      href: "/signups",
      icon: Clock,
      value: metrics.trialsEnding7d,
      styleKey: "pending_setup_payments",
    },
    {
      key: "trial_expired",
      title: "Trial expired (awaiting setup)",
      href: "/signups",
      icon: AlertTriangle,
      value: metrics.trialExpiredAwaitingSetup,
      styleKey: "banned_tenants",
    },
    {
      key: "suspended_tenants",
      title: "Suspended",
      href: "/tenants?filter=inactive",
      icon: AlertTriangle,
      value: summaryValue(summary, "suspended_tenants"),
      styleKey: "suspended_tenants",
    },
    {
      key: "banned_tenants",
      title: "Banned",
      href: "/tenants?filter=inactive",
      icon: Ban,
      value: summaryValue(summary, "banned_tenants"),
      styleKey: "banned_tenants",
    },
  ];
}

export function ApexStatGrid({
  summary,
  metrics,
}: {
  summary: DashboardSummary;
  metrics: TenantPortfolioMetrics;
}) {
  const stats = buildStats(summary, metrics);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const styles = APEX_STAT_STYLES[stat.styleKey];
        const needsAttention = stat.value > 0 && Boolean(stat.href);

        const inner = (
          <Card
            className={cn(
              "apex-stat-card apex-stat-stagger apex-panel-surface overflow-hidden border-2 p-0",
              styles.accent,
              stat.href && "apex-stat-card-interactive cursor-pointer",
              needsAttention && "apex-stat-card-attention",
            )}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className={cn("h-1 w-full", styles.topBar)} />
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    styles.icon,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-3xl font-bold tabular-nums tracking-tight",
                      styles.value,
                    )}
                  >
                    {stat.value}
                  </p>
                  {needsAttention ? (
                    <p className="mt-2 text-xs font-semibold text-primary">Needs review →</p>
                  ) : null}
                </div>
              </div>
              {stat.href ? (
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              ) : null}
            </CardContent>
          </Card>
        );

        if (stat.href) {
          return (
            <Link
              key={stat.key}
              href={stat.href}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {inner}
            </Link>
          );
        }
        return <div key={stat.key}>{inner}</div>;
      })}
    </div>
  );
}
