import Link from "next/link";
import { ArrowRight, CreditCard, MessageCircle, Server, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROWS = [
  {
    key: "setup",
    label: "Setup payments",
    href: "/payments/setup",
    icon: UserPlus,
    badgeKey: "pending_setup_payments" as const,
    iconClass: "bg-[oklch(0.28_0.05_195)] text-[oklch(0.9_0.04_195)] ring-[oklch(0.62_0.12_195/0.35)]",
  },
  {
    key: "quarterly",
    label: "Quarterly payments",
    href: "/payments/quarterly",
    icon: CreditCard,
    badgeKey: "pending_quarterly_payments" as const,
    iconClass: "bg-[oklch(0.32_0.06_85)] text-[oklch(0.92_0.04_85)] ring-[oklch(0.72_0.08_85/0.35)]",
  },
  {
    key: "signups",
    label: "New signups",
    href: "/signups",
    icon: UserPlus,
    badgeKey: "setup_pending_tenants" as const,
    iconClass: "bg-[oklch(0.28_0.05_300)] text-[oklch(0.9_0.04_300)] ring-[oklch(0.62_0.1_300/0.35)]",
  },
  {
    key: "chat",
    label: "Unread chats",
    href: "/feedback",
    icon: MessageCircle,
    badgeKey: "unread_feedback" as const,
    iconClass: "bg-[oklch(0.28_0.05_155)] text-[oklch(0.9_0.04_155)] ring-[oklch(0.55_0.1_155/0.35)]",
  },
  {
    key: "ops-mode",
    label: "Ops mode requests",
    href: "/ops-mode-requests",
    icon: Server,
    badgeKey: "pending_ops_mode_requests" as const,
    iconClass: "bg-[oklch(0.28_0.05_300)] text-[oklch(0.9_0.04_300)] ring-[oklch(0.62_0.1_300/0.35)]",
  },
];

export function ApexQueueOverview({ summary }: { summary: DashboardSummary }) {
  const total = ROWS.reduce((sum, row) => sum + (summary[row.badgeKey] || 0), 0);

  return (
    <Card className="apex-panel-surface border-2">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold">Action queues</CardTitle>
        <CardDescription className="text-[13px]">
          {total > 0
            ? `${total} item${total === 1 ? "" : "s"} waiting across your workflows`
            : "All queues are clear — no pending actions"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pt-5">
        {ROWS.map((row) => {
          const count = summary[row.badgeKey] || 0;
          const Icon = row.icon;
          return (
            <Link
              key={row.key}
              href={row.href}
              className="group flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
                    row.iconClass,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary">
                  {row.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "min-w-8 rounded-md px-2 py-0.5 text-center text-sm font-bold tabular-nums",
                    count > 0
                      ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                      : "bg-muted text-muted-foreground ring-1 ring-border",
                  )}
                >
                  {count}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
