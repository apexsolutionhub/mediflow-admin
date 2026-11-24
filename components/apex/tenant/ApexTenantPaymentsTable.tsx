"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import { ApexApproveRejectActions } from "@/components/apex/ApexApproveRejectActions";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { PaymentStatusBadge } from "@/components/apex/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ApexTenantTabShell } from "@/components/apex/tenant/ApexTenantTabShell";
import { ApexEmptyState } from "@/components/apex/PageChrome";
import {
  approveQuarterlyPayment,
  approveSetupPayment,
  getErrorMessage,
  rejectPayment,
} from "@/lib/api";
import type { PaymentSubmission } from "@/lib/types";

type Props = {
  tin: string;
  payments: PaymentSubmission[];
  busy: boolean;
  onChanged: () => void;
};

export function ApexTenantPaymentsTable({ tin, payments, busy, onChanged }: Props) {
  const [actingId, setActingId] = useState<number | null>(null);
  const pendingCount = payments.filter(
    (p) => String(p.status).toLowerCase() === "pending",
  ).length;

  const run = async (id: number, fn: () => Promise<void>) => {
    setActingId(id);
    try {
      await fn();
      toast.success("Payment updated");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const columns = useMemo<ColumnDef<PaymentSubmission>[]>(
    () => [
      {
        accessorKey: "payment_kind",
        header: "Kind",
        cell: ({ row }) => (
          <span className="font-medium capitalize">{row.original.payment_kind}</span>
        ),
      },
      {
        accessorKey: "amount_etb",
        header: "Amount",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.amount_etb.toLocaleString()} ETB
          </span>
        ),
      },
      {
        accessorKey: "transaction_ref",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.transaction_ref}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "submitted_at",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {new Date(row.original.submitted_at).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            {row.original.status === "pending" ? (
              <ApexApproveRejectActions
                busy={busy || actingId === row.original.id}
                approveLabel="Approve"
                approveConfirmTitle={`Approve ${row.original.payment_kind} payment?`}
                approveConfirmDescription={`Verify reference ${row.original.transaction_ref} before approving.`}
                rejectTitle={`Reject ${row.original.payment_kind} payment`}
                rejectDescription="The clinic will need to resubmit with a corrected transfer reference."
                onApprove={() =>
                  run(row.original.id, async () => {
                    if (row.original.payment_kind === "setup") {
                      await approveSetupPayment(tin);
                    } else {
                      await approveQuarterlyPayment(tin);
                    }
                  })
                }
                onReject={(reason) =>
                  run(row.original.id, () =>
                    rejectPayment(row.original.id, reason).then(() => undefined),
                  )
                }
              />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
    ],
    [actingId, busy, tin],
  );

  return (
    <ApexTenantTabShell
      title="Payment history"
      description="Approve or reject pending submissions from this clinic."
      icon={Receipt}
      tone="gold"
      contentClassName="px-0 py-0"
      actions={
        pendingCount > 0 ? (
          <Badge variant="warning">{pendingCount} pending</Badge>
        ) : (
          <Badge variant="outline">{payments.length} total</Badge>
        )
      }
    >
      {payments.length === 0 ? (
        <div className="px-5 py-5 sm:px-6">
          <ApexEmptyState
            icon={Receipt}
            title="No payment submissions"
            description="Setup and quarterly proofs will list here once submitted."
          />
        </div>
      ) : (
        <ApexDataTable
          data={payments}
          columns={columns}
          noun="payments"
          pageSize={10}
        />
      )}
    </ApexTenantTabShell>
  );
}
