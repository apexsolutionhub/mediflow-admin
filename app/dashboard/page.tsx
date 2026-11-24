"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  ApexErrorAlert,
  ApexEmptyState,
  ApexPageHeader,
  ApexSectionHeader,
} from "@/components/apex/PageChrome";
import { ApexDashboardQuickActions } from "@/components/apex/overview/ApexDashboardQuickActions";
import { ApexMonitoringStats } from "@/components/apex/overview/ApexMonitoringStats";
import { ApexOverviewHeroActions } from "@/components/apex/overview/ApexOverviewHeroActions";
import { ApexPortfolioHealth } from "@/components/apex/overview/ApexPortfolioHealth";
import { ApexSmartInsights } from "@/components/apex/overview/ApexSmartInsights";
import { ApexStatGrid } from "@/components/apex/overview/ApexStatGrid";
import { ApexBarBreakdown } from "@/components/apex/overview/ApexBarBreakdown";
import { ApexDonutChart } from "@/components/apex/charts/ApexDonutChart";
import {
  getDashboardSummary,
  getErrorMessage,
  getStoredToken,
  getStoredUser,
  isUnauthenticatedError,
  listTenants,
} from "@/lib/api";
import {
  computeTenantPortfolioMetrics,
  portfolioHealthScore,
} from "@/lib/overviewMetrics";
import type { DashboardSummary, Tenant } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

function subscriptionMixChart(tenants: Tenant[]) {
  let active = 0;
  let billingHold = 0;
  let exempt = 0;
  let other = 0;

  for (const tenant of tenants) {
    if (tenant.is_illustration) {
      exempt += 1;
      continue;
    }
    if (tenant.billing_hold) {
      billingHold += 1;
      continue;
    }
    if (tenant.account_status === "active") {
      active += 1;
      continue;
    }
    other += 1;
  }

  return [
    { label: "Active", value: active, color: "oklch(0.72 0.12 160)" },
    { label: "Billing hold", value: billingHold, color: "oklch(0.78 0.12 55)" },
    { label: "Exempt", value: exempt, color: "oklch(0.68 0.12 300)" },
    { label: "Other", value: other, color: "oklch(0.55 0.02 160)" },
  ].filter((d) => d.value > 0);
}

function statusBreakdown(tenants: Tenant[]) {
  const counts: Record<string, number> = {};
  for (const tenant of tenants) {
    const key = tenant.account_status || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  const colors: Record<string, string> = {
    active: "oklch(0.72 0.12 160)",
    suspended: "oklch(0.78 0.12 55)",
    banned: "oklch(0.65 0.18 25)",
    deleted: "oklch(0.55 0.02 160)",
  };
  return Object.entries(counts).map(([label, value]) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value,
    color: colors[label] || "oklch(0.65 0.05 200)",
  }));
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = getStoredUser();
  const firstName = (user?.full_name || user?.username || "Apex").split(/\s+/)[0];

  const loadOverview = useCallback(async (silent = false) => {
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [s, t] = await Promise.all([getDashboardSummary(), listTenants()]);
      setSummary(s);
      setTenants(t);
      setError(null);
    } catch (err) {
      if (isUnauthenticatedError(err)) return;
      const msg = getErrorMessage(err);
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    const onRefresh = () => void loadOverview(true);
    window.addEventListener("apex:refresh", onRefresh);
    return () => window.removeEventListener("apex:refresh", onRefresh);
  }, [loadOverview]);

  const metrics = useMemo(() => computeTenantPortfolioMetrics(tenants), [tenants]);
  const healthScore = useMemo(
    () => (summary ? portfolioHealthScore(summary, metrics) : 0),
    [summary, metrics],
  );
  const subscriptionData = useMemo(() => subscriptionMixChart(tenants), [tenants]);
  const statusData = useMemo(() => statusBreakdown(tenants), [tenants]);

  const pendingTotal = summary
    ? summary.pending_setup_payments +
      summary.pending_quarterly_payments +
      (summary.unread_feedback || 0) +
      (summary.pending_ops_mode_requests || 0)
    : 0;

  return (
    <ConsoleShell>
      {loading && !summary ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Spinner />
          Loading overview…
        </div>
      ) : error && !summary ? (
        <div className="space-y-6">
          <ApexPageHeader title="Overview" description="Platform snapshot and action queues" />
          <ApexErrorAlert message={error} />
          <p className="text-sm text-muted-foreground">
            Use the refresh control in the top bar to try again after fixing the API or database.
          </p>
        </div>
      ) : !summary ? (
        <ApexEmptyState
          icon={LayoutDashboard}
          title="No overview data"
          description="Refresh the page or check your connection to the Apex API."
        />
      ) : (
        <div className="space-y-10">
          <ApexPageHeader
            title={`Welcome back, ${firstName}`}
            description={
              pendingTotal > 0
                ? `${pendingTotal} item${pendingTotal === 1 ? "" : "s"} across your queues need attention today.`
                : `${summary.tenants_total} clinics on MediFlow — all queues are clear.`
            }
            actions={<ApexOverviewHeroActions />}
          />

          <ApexDashboardQuickActions summary={summary} />
          <ApexPortfolioHealth score={healthScore} />
          <ApexSmartInsights metrics={metrics} />

          <section className="space-y-5">
            <ApexSectionHeader
              title="Action queues"
              description="Click a card to open the matching workflow."
            />
            <ApexStatGrid summary={summary} metrics={metrics} />
          </section>

          <section className="space-y-5">
            <ApexSectionHeader
              title="Platform monitoring"
              description="Users and clinic mix across the portfolio."
            />
            <ApexMonitoringStats summary={summary} metrics={metrics} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ApexDonutChart
              title="Subscription mix"
              description="Active, billing hold, and exempt clinics"
              data={subscriptionData}
              centerValue={summary.tenants_total}
              centerLabel="clinics"
            />
            <ApexBarBreakdown
              title="Clinics by status"
              description="Account state across the portfolio"
              data={statusData}
            />
          </section>
        </div>
      )}
    </ConsoleShell>
  );
}
