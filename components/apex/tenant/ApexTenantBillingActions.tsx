"use client";

import { CreditCard, Landmark, PauseCircle, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApexApproveRejectActions } from "@/components/apex/ApexApproveRejectActions";
import { ApexConfirmDialog } from "@/components/apex/ApexConfirmDialog";
import {
  ApexTenantMetricTile,
  ApexTenantTabShell,
} from "@/components/apex/tenant/ApexTenantTabShell";
import { SubscriptionStatusBadge } from "@/components/apex/StatusBadge";
import { deriveSubscriptionStatus } from "@/lib/analytics";
import type { PaymentSubmission, Tenant } from "@/lib/types";

type Props = {
  tenant: Tenant;
  payments: PaymentSubmission[];
  busy: boolean;
  onApproveSetup: () => void;
  onRejectSetup: (reason: string) => void;
  onApproveQuarterly: () => void;
  onReleaseHold: () => void;
  onSetBillingHold: () => void;
};

export function ApexTenantBillingActions({
  tenant,
  payments,
  busy,
  onApproveSetup,
  onRejectSetup,
  onApproveQuarterly,
  onReleaseHold,
  onSetBillingHold,
}: Props) {
  const subscriptionStatus = deriveSubscriptionStatus(tenant);

  const pendingSetup = payments.find(
    (p) => p.payment_kind === "setup" && p.status === "pending",
  );
  const pendingQuarterly = payments.find(
    (p) => p.payment_kind === "quarterly" && p.status === "pending",
  );
  const canApproveQuarterly =
    subscriptionStatus === "grace" ||
    subscriptionStatus === "pending_approval" ||
    Boolean(pendingQuarterly);

  return (
    <ApexTenantTabShell
      title="Billing actions"
      description="Approve or reject payments and manage billing hold for this clinic."
      icon={CreditCard}
      tone="gold"
      actions={<SubscriptionStatusBadge status={subscriptionStatus} />}
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ApexTenantMetricTile
            label="Setup fee"
            value={`${Number(tenant.setup_fee_etb || 0).toLocaleString()} ETB`}
            sub={tenant.setup_fee_approved ? "Approved" : "Pending approval"}
          />
          <ApexTenantMetricTile
            label="Quarterly fee"
            value={`${Number(tenant.quarterly_fee_etb || 0).toLocaleString()} ETB`}
            sub="Per quarter"
          />
          <ApexTenantMetricTile
            label="Paid until"
            value={
              tenant.subscription_paid_until
                ? new Date(tenant.subscription_paid_until).toLocaleDateString()
                : "—"
            }
            sub={`${tenant.paid_quarters_count ?? 0} quarter${
              (tenant.paid_quarters_count ?? 0) === 1 ? "" : "s"
            } paid`}
          />
          <ApexTenantMetricTile
            label="Bank transfer"
            value={<span className="font-mono text-xs">1000418779358</span>}
            sub="CBE account"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Setup payment</h3>
              {tenant.setup_fee_approved ? (
                <Badge variant="success">Approved</Badge>
              ) : (
                <Badge variant="warning">Pending</Badge>
              )}
            </div>
            {pendingSetup ? (
              <p className="text-xs text-muted-foreground">
                Ref:{" "}
                <span className="font-mono text-foreground/90">
                  {pendingSetup.transaction_ref}
                </span>
              </p>
            ) : null}
            {!tenant.setup_fee_approved ? (
              <ApexApproveRejectActions
                busy={busy}
                approveLabel="Approve setup"
                rejectTitle="Reject setup payment"
                rejectDescription="The clinic must resubmit payment with a corrected transfer reference."
                approveConfirmTitle="Approve setup payment?"
                approveConfirmDescription="Verify the CBE transfer reference before approving. The clinic can sign in after approval."
                approveDisabled={!pendingSetup}
                rejectDisabled={!pendingSetup}
                onApprove={onApproveSetup}
                onReject={onRejectSetup}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Setup already approved.</p>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Quarterly payment</h3>
              {canApproveQuarterly ? (
                <Badge variant="warning">Action needed</Badge>
              ) : (
                <Badge variant="outline">Quiet</Badge>
              )}
            </div>
            {pendingQuarterly ? (
              <p className="text-xs text-muted-foreground">
                Ref:{" "}
                <span className="font-mono text-foreground/90">
                  {pendingQuarterly.transaction_ref}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Approve when status is grace or payment is pending.
              </p>
            )}
            {canApproveQuarterly ? (
              <ApexConfirmDialog
                title="Approve quarterly payment?"
                description="Extends the clinic's paid subscription period after you verify the transfer reference."
                confirmLabel="Approve quarterly"
                destructive={false}
                disabled={busy}
                onConfirm={onApproveQuarterly}
                trigger={
                  <Button
                    size="sm"
                    variant="success"
                    className="apex-row-action"
                    disabled={busy}
                  >
                    Approve quarterly
                  </Button>
                }
              />
            ) : null}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Billing hold</h3>
              {tenant.billing_hold ? (
                <Badge variant="warning">On hold</Badge>
              ) : (
                <Badge variant="success">Open</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Holds pause billing and block clinic staff login until released.
            </p>
            {tenant.billing_hold ? (
              <ApexConfirmDialog
                title="Release billing hold?"
                description="Staff can sign in again when subscription status allows access."
                confirmLabel="Release hold"
                destructive={false}
                disabled={busy}
                onConfirm={onReleaseHold}
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="apex-row-action gap-1.5"
                    disabled={busy}
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    Release hold
                  </Button>
                }
              />
            ) : (
              <ApexConfirmDialog
                title="Place clinic on billing hold?"
                description="All staff logins will be blocked until you release the hold."
                confirmLabel="Place on hold"
                disabled={busy}
                onConfirm={onSetBillingHold}
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="apex-row-action gap-1.5"
                    disabled={busy}
                  >
                    <PauseCircle className="h-3.5 w-3.5" />
                    Place on hold
                  </Button>
                }
              />
            )}
          </section>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Landmark className="h-3.5 w-3.5 shrink-0" />
          Verify CBE transfer references before approving.
        </p>
      </div>
    </ApexTenantTabShell>
  );
}
