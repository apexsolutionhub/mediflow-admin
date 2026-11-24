"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  ApexErrorAlert,
  ApexPageHeader,
  ApexSectionHeader,
} from "@/components/apex/PageChrome";
import { ApexDonutChart } from "@/components/apex/charts/ApexDonutChart";
import {
  ApexActivityBarChart,
  ApexTenantGrowthChart,
} from "@/components/apex/charts/ApexAreaBarCharts";
import { ApexAnalyticsPortfolioHealth } from "@/components/apex/reports/ApexAnalyticsPortfolioHealth";
import { ApexRevenueCards } from "@/components/apex/reports/ApexRevenueCards";
import { ApexIssuesPanel } from "@/components/apex/reports/ApexIssuesPanel";
import { ApexQueueOverview } from "@/components/apex/reports/ApexQueueOverview";
import { ApexSubscriptionBreakdown } from "@/components/apex/reports/ApexSubscriptionBreakdown";
import {
  getDashboardSummary,
  getErrorMessage,
  isUnauthenticatedError,
  listAuditLogs,
  listFeedbackDirectory,
  listTenants,
} from "@/lib/api";
import {
  aggregateAccountStatus,
  aggregateAuditActivity,
  aggregateFeedbackActivity,
  aggregateSubscriptionStatus,
  aggregateTenantGrowth,
  buildIssueCategories,
  estimateRevenue,
} from "@/lib/analytics";
import type { DashboardSummary, Tenant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function ReportsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditActivity, setAuditActivity] = useState<
    { label: string; value: number; color: string }[]
  >([]);
  const [feedbackStats, setFeedbackStats] = useState({ open: 0, closed: 0, unread: 0 });

  async function load() {
    setError(null);
    try {
      const [s, tenantList, logs, feedback] = await Promise.all([
        getDashboardSummary(),
        listTenants(),
        listAuditLogs(),
        listFeedbackDirectory(),
      ]);
      setSummary(s);
      setTenants(tenantList);
      setAuditActivity(
        aggregateAuditActivity(logs).map((d) => ({
          label: d.label,
          value: d.value,
          color: d.color,
        })),
      );
      setFeedbackStats(aggregateFeedbackActivity(feedback));
    } catch (err) {
      if (isUnauthenticatedError(err)) return;
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    }
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  const subscriptionData = useMemo(() => aggregateSubscriptionStatus(tenants), [tenants]);
  const accountData = useMemo(() => aggregateAccountStatus(tenants), [tenants]);
  const growthData = useMemo(() => aggregateTenantGrowth(tenants), [tenants]);
  const revenue = useMemo(() => estimateRevenue(tenants), [tenants]);
  const issues = useMemo(
    () => (summary ? buildIssueCategories(tenants, summary) : []),
    [tenants, summary],
  );

  const exportSummary = () => {
    if (!summary) return;
    const report = {
      generatedAt: new Date().toISOString(),
      portfolioHealth: summary,
      revenue,
      subscriptionBreakdown: subscriptionData,
      accountBreakdown: accountData,
      issues,
      feedback: feedbackStats,
      tenantCount: tenants.length,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medicare-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ConsoleShell>
      {loading && !summary ? (
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
          <Spinner /> Building analytics…
        </div>
      ) : !summary ? (
        <div className="space-y-6">
          <ApexPageHeader title="Analytics & reports" description="Portfolio intelligence" />
          <ApexErrorAlert message={error ?? "Unable to load dashboard summary."} />
        </div>
      ) : (
        <div className="space-y-10">
          <ApexPageHeader
            title="Analytics & reports"
            description="Visual intelligence across tenants, billing, issues, and portfolio growth"
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      await load();
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button variant="apex" size="sm" onClick={exportSummary}>
                  <Download className="mr-2 h-4 w-4" />
                  Export report
                </Button>
              </div>
            }
          />

          {error ? <ApexErrorAlert message={error} /> : null}

          <ApexAnalyticsPortfolioHealth summary={summary} tenants={tenants} />

          <section className="space-y-5">
            <ApexSectionHeader
              title="Revenue snapshot"
              description="Estimated recurring and pipeline revenue from current tenant fees (ETB)."
            />
            <ApexRevenueCards revenue={revenue} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ApexDonutChart
              title="Subscription health"
              description="Distribution of subscription statuses across all clinics"
              data={subscriptionData}
              centerValue={summary.tenants_total}
              centerLabel="Total"
            />
            <ApexDonutChart
              title="Account status"
              description="Active, suspended, and banned clinic accounts"
              data={accountData}
              centerValue={accountData.find((d) => d.key === "active")?.value ?? 0}
              centerLabel="Active"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ApexTenantGrowthChart data={growthData} />
            <ApexActivityBarChart
              title="Admin activity (14 days)"
              description="Apex team actions logged in the audit trail"
              data={auditActivity}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ApexQueueOverview summary={summary} />
            <ApexIssuesPanel issues={issues} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ApexSubscriptionBreakdown data={subscriptionData} />
            <div className="apex-panel-surface rounded-xl border-2 p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Clinic chat summary</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center ring-1 ring-border">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {feedbackStats.open}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Open threads</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center ring-1 ring-border">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {feedbackStats.unread}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Unread</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center ring-1 ring-border">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {feedbackStats.closed}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Closed</p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
                <Link href="/feedback">Open clinic chat →</Link>
              </Button>
            </div>
          </section>
        </div>
      )}
    </ConsoleShell>
  );
}
