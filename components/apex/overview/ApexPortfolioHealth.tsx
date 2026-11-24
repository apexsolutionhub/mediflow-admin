import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { portfolioHealthLabel } from "@/lib/overviewMetrics";
import { cn } from "@/lib/utils";

export function ApexPortfolioHealth({ score }: { score: number }) {
  const label = portfolioHealthLabel(score);
  const tone =
    score >= 85 ? "healthy" : score >= 65 ? "stable" : "risk";

  return (
    <Card className="apex-panel-surface overflow-hidden border-2">
      <div className="h-1 bg-linear-to-r from-primary via-[oklch(0.72_0.08_85)] to-[oklch(0.68_0.12_300)]" />
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Portfolio health
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className={cn(
                  "text-lg font-semibold",
                  tone === "healthy" && "text-primary",
                  tone === "stable" && "text-[oklch(0.85_0.08_85)]",
                  tone === "risk" && "text-[oklch(0.78_0.14_25)]",
                )}
              >
                {label}
              </p>
              <p className="text-3xl font-bold tabular-nums tracking-tight">
                {score}
                <span className="text-base font-medium text-muted-foreground">/100</span>
              </p>
            </div>
          </div>
          <Link
            href="/reports"
            className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            View full analytics →
          </Link>
        </div>

        <div className="space-y-2">
          <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                tone === "healthy" &&
                  "bg-linear-to-r from-primary to-[oklch(0.72_0.08_85)]",
                tone === "stable" &&
                  "bg-linear-to-r from-[oklch(0.72_0.08_85)] to-[oklch(0.68_0.12_300)]",
                tone === "risk" &&
                  "bg-linear-to-r from-[oklch(0.78_0.14_25)] to-[oklch(0.85_0.1_55)]",
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Composite score from queues, billing holds, and account status across your clinics.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
