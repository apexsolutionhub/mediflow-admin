import Link from "next/link";
import { ArrowUpRight, Ban, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/types";
import type { TenantPortfolioMetrics } from "@/lib/overviewMetrics";
import { cn } from "@/lib/utils";

export function ApexMonitoringStats({
  summary,
  metrics,
}: {
  summary: DashboardSummary;
  metrics: TenantPortfolioMetrics;
}) {
  const items = [
    {
      label: "Tenant users",
      sub: "Across all clinics",
      value: metrics.totalStaff,
      href: "/users",
      icon: Users,
      iconWrap: "bg-[oklch(0.28_0.04_160)] text-primary ring-primary/30",
      valueClass: "text-primary",
    },
    {
      label: "Disabled logins",
      sub: (summary.disabled_users || 0) > 0 ? "Needs review →" : "All accounts enabled",
      value: summary.disabled_users || 0,
      href: "/users",
      icon: Ban,
      iconWrap: "bg-[oklch(0.28_0.05_55)] text-[oklch(0.85_0.1_55)] ring-[oklch(0.7_0.12_55/0.3)]",
      valueClass: "text-[oklch(0.85_0.1_55)]",
      needsReview: (summary.disabled_users || 0) > 0,
    },
    {
      label: "Active clinics",
      sub: `${summary.tenants_active} of ${summary.tenants_total} on platform`,
      value: summary.tenants_active,
      href: "/tenants",
      icon: Users,
      iconWrap: "bg-[oklch(0.28_0.05_300)] text-[oklch(0.82_0.1_300)] ring-[oklch(0.6_0.1_300/0.3)]",
      valueClass: "text-[oklch(0.82_0.1_300)]",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.label} href={item.href} className="group block">
            <Card className="apex-panel-surface apex-stat-card-interactive relative overflow-hidden border-2">
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1",
                      item.iconWrap,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <p className={cn("mt-0.5 text-3xl font-bold tabular-nums", item.valueClass)}>
                      {item.value}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-xs",
                        item.needsReview
                          ? "font-semibold text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.sub}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
