import { CheckCircle2, Info, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TenantPortfolioMetrics } from "@/lib/overviewMetrics";
import { ApexSectionHeader } from "@/components/apex/PageChrome";

export function ApexSmartInsights({ metrics }: { metrics: TenantPortfolioMetrics }) {
  const avgQuarterly =
    metrics.payingPharmacies > 0
      ? Math.round(metrics.quarterlyMrr / metrics.payingPharmacies)
      : 0;

  return (
    <section className="space-y-4">
      <ApexSectionHeader
        title="Smart insights"
        description="Actionable signals from your portfolio — updated on every refresh."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="apex-panel-surface border-2">
          <CardContent className="flex gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.28_0.04_160)] text-primary ring-1 ring-primary/30">
              <Info className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                ETB {metrics.quarterlyMrr.toLocaleString()} quarterly recurring
              </p>
              <p className="text-sm text-muted-foreground">
                Across {metrics.payingPharmacies} paying{" "}
                {metrics.payingPharmacies === 1 ? "clinic" : "clinics"}
                {avgQuarterly > 0 ? ` · avg ETB ${avgQuarterly.toLocaleString()}/quarter` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="apex-panel-surface border-2">
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.28_0.05_145)] text-[oklch(0.78_0.12_145)] ring-1 ring-[oklch(0.55_0.1_145/0.3)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  +{metrics.newLast30Days} new{" "}
                  {metrics.newLast30Days === 1 ? "clinic" : "clinics"} in the last 30 days
                </p>
                <p className="text-sm text-muted-foreground">
                  Growth signal from recent MediFlow signups and onboarding.
                </p>
              </div>
            </div>
            {metrics.newLast30Days > 0 ? (
              <span className="shrink-0 rounded-full bg-[oklch(0.28_0.05_145)] px-2.5 py-1 text-xs font-bold text-[oklch(0.78_0.12_145)]">
                +{metrics.newLast30Days}
              </span>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[oklch(0.3_0.04_85)] text-[oklch(0.88_0.08_85)]">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        Insights refresh when you reload the overview or use the top-bar refresh control.
      </div>
    </section>
  );
}
