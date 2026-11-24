"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AccountStatusBadge,
  SubscriptionStatusBadge,
} from "@/components/apex/StatusBadge";
import { Panel } from "@/components/apex/PageChrome";
import { Skeleton } from "@/components/ui/skeleton";
import { deriveSubscriptionStatus } from "@/lib/analytics";
import { getTenant } from "@/lib/api";
import type { Tenant } from "@/lib/types";

export function ApexFeedbackTenantContext({ pharmacyTin }: { pharmacyTin: string }) {
  const [ctx, setCtx] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getTenant(pharmacyTin)
      .then((tenant) => {
        if (!cancelled) setCtx(tenant);
      })
      .catch(() => {
        if (!cancelled) setCtx(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pharmacyTin]);

  if (loading) {
    return (
      <Panel className="space-y-2 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </Panel>
    );
  }

  if (!ctx) return null;

  const subscriptionStatus = deriveSubscriptionStatus(ctx);

  return (
    <Panel className="p-4 text-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Support context
      </p>
      <div className="flex flex-wrap gap-2">
        <AccountStatusBadge status={ctx.account_status} />
        <SubscriptionStatusBadge status={subscriptionStatus} />
      </div>
      <ul className="mt-3 space-y-1 text-muted-foreground">
        <li>
          Setup: {ctx.setup_fee_approved ? "approved" : "pending"} ·{" "}
          {(ctx.setup_fee_etb ?? 0).toLocaleString()} ETB
        </li>
        <li>
          Paid until:{" "}
          {ctx.subscription_paid_until
            ? new Date(ctx.subscription_paid_until).toLocaleDateString()
            : "—"}
        </li>
        {ctx.payment_transaction_ref ? (
          <li className="font-mono text-xs">Ref: {ctx.payment_transaction_ref}</li>
        ) : null}
      </ul>
      <Link
        href={`/tenants/${encodeURIComponent(pharmacyTin)}`}
        className="mt-3 inline-block text-xs font-medium text-[oklch(0.78_0.04_85)] hover:underline"
      >
        Open tenant profile →
      </Link>
    </Panel>
  );
}
