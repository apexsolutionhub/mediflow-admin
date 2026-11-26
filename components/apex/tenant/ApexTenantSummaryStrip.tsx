"use client";

import { useState } from "react";
import { Building2, CalendarClock, Server, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { Tenant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ClinicServerDialog } from "@/components/apex/ClinicServerDialog";
import { OpsModePill } from "@/components/apex/OpsModePill";
import {
  AccountStatusBadge,
  SubscriptionStatusBadge,
} from "@/components/apex/StatusBadge";
import { deriveSubscriptionStatus } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function ApexTenantSummaryStrip({ tenant }: { tenant: Tenant }) {
  const [serverOpen, setServerOpen] = useState(false);
  const manager =
    tenant.manager_username ||
    tenant.staff?.find((s) => (s.role || "").toLowerCase() === "manager")?.username ||
    "—";
  const subscriptionStatus = deriveSubscriptionStatus(tenant);

  const items = [
    {
      label: "Setup fee",
      value: `${Number(tenant.setup_fee_etb || 0).toLocaleString()} ETB`,
      sub: tenant.setup_fee_approved ? "Approved" : "Pending approval",
      icon: Wallet,
      tone: "gold" as const,
    },
    {
      label: "Quarterly fee",
      value: `${Number(tenant.quarterly_fee_etb || 0).toLocaleString()} ETB`,
      sub: "Per quarter",
      icon: Building2,
      tone: "teal" as const,
    },
    {
      label: "Paid until",
      value: tenant.subscription_paid_until
        ? new Date(tenant.subscription_paid_until).toLocaleDateString()
        : "—",
      sub: `${tenant.paid_quarters_count ?? 0} period${
        (tenant.paid_quarters_count ?? 0) === 1 ? "" : "s"
      } paid`,
      icon: CalendarClock,
      tone: "violet" as const,
    },
    {
      label: "Staff",
      value: String(tenant.staff_count ?? tenant.staff?.length ?? 0),
      sub: `${tenant.manager_count ?? 0} manager · ${tenant.pharmacist_count ?? 0} staff`,
      icon: Users,
      tone: "emerald" as const,
    },
  ];

  const toneIcon = {
    gold: "bg-[oklch(0.32_0.05_85)] text-[oklch(0.9_0.05_85)] ring-1 ring-[oklch(0.7_0.08_85/0.35)]",
    teal: "bg-[oklch(0.28_0.05_160)] text-[oklch(0.9_0.04_160)] ring-1 ring-[oklch(0.62_0.12_160/0.35)]",
    violet:
      "bg-[oklch(0.3_0.05_300)] text-[oklch(0.92_0.04_300)] ring-1 ring-[oklch(0.62_0.1_300/0.35)]",
    emerald:
      "bg-[oklch(0.28_0.05_155)] text-[oklch(0.9_0.04_155)] ring-1 ring-[oklch(0.62_0.12_155/0.35)]",
  };

  return (
    <div className="apex-tenant-summary-strip apex-panel-surface relative overflow-hidden rounded-2xl border border-border">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[oklch(0.55_0.08_85/0.14)] blur-3xl" />
        <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-[oklch(0.5_0.08_160/0.12)] blur-3xl" />
      </div>
      <div className="relative h-1 bg-linear-to-r from-[oklch(0.78_0.08_85)] via-[oklch(0.65_0.1_160)] to-[oklch(0.62_0.1_300)]" />

      <div className="relative space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/50">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-[oklch(0.82_0.05_85)]" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[oklch(0.75_0.04_85)]">
                  Clinic profile
                </p>
                <h2 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {tenant.pharmacy_name || tenant.pharmacy_tin}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  TIN {tenant.pharmacy_tin}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BadgePill>Clinic</BadgePill>
                <OpsModePill mode={tenant.ops_mode || "online"} />
                <AccountStatusBadge status={tenant.account_status} />
                <SubscriptionStatusBadge status={subscriptionStatus} />
                {tenant.billing_hold ? (
                  <span className="rounded-full border border-[oklch(0.75_0.12_75/0.35)] bg-[oklch(0.55_0.05_75/0.12)] px-2.5 py-0.5 text-[11px] font-medium text-[oklch(0.88_0.04_75)]">
                    Billing hold
                  </span>
                ) : null}
                {tenant.is_illustration ? (
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Illustration
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/ops-mode-requests"
                  className="text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  Review ops mode requests
                </Link>
                {tenant.ops_mode === "offline" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 rounded-full px-3 text-[11px]"
                    onClick={() => setServerOpen(true)}
                  >
                    <Server className="size-3.5" />
                    Clinic server
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-border bg-muted/70 px-3.5 py-2.5 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Primary login
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{manager}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-muted/40 p-3.5 transition-colors hover:border-border hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      toneIcon[item.tone],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold tabular-nums tracking-tight">
                      {item.value}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ClinicServerDialog
        tin={tenant.pharmacy_tin}
        open={serverOpen}
        onOpenChange={setServerOpen}
      />
    </div>
  );
}

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
      {children}
    </span>
  );
}
