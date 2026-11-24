"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard, UserPlus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexApproveRejectActions } from "@/components/apex/ApexApproveRejectActions";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ApexEmptyState, ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  approveQuarterlyPayment,
  approveSetupPayment,
  getErrorMessage,
  isUnauthenticatedError,
  listPendingPayments,
  rejectPayment,
} from "@/lib/api";
import type { PaymentSubmission } from "@/lib/types";

type PaymentKind = "setup" | "quarterly";

const META: Record<
  PaymentKind,
  {
    title: string;
    description: string;
    icon: typeof UserPlus;
  }
> = {
  setup: {
    title: "Setup payments",
    description:
      "One-time setup fee submissions — verify transfer IDs, then approve or reject each clinic.",
    icon: UserPlus,
  },
  quarterly: {
    title: "Quarterly payments",
    description:
      "Clinic quarterly subscriptions — verify transfer IDs, then approve to extend paid-until.",
    icon: CreditCard,
  },
};

export function PaymentsQueue({ kind }: { kind: PaymentKind }) {
  const meta = META[kind];
  const [rows, setRows] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listPendingPayments(kind));
    } catch (err) {
      if (!isUnauthenticatedError(err)) toast.error(getErrorMessage(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: number, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      toast.success("Payment updated");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo<ColumnDef<PaymentSubmission>[]>(
    () => [
      {
        accessorKey: "pharmacy_name",
        header: "Clinic",
        cell: ({ row }) => (
          <Link
            href={`/tenants/${encodeURIComponent(row.original.pharmacy_tin)}`}
            className="font-medium transition-colors hover:text-[oklch(0.82_0.04_85)]"
          >
            {row.original.pharmacy_name || "—"}
          </Link>
        ),
      },
      {
        accessorKey: "pharmacy_tin",
        header: "TIN",
        meta: { label: "TIN" },
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.pharmacy_tin}</span>
        ),
      },
      {
        accessorKey: "amount_etb",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.amount_etb.toLocaleString()} ETB
          </span>
        ),
      },
      {
        accessorKey: "payment_channel",
        header: "Channel",
      },
      {
        accessorKey: "transaction_ref",
        header: "Reference",
        meta: { label: "Reference" },
        cell: ({ row }) => (
          <span className="block max-w-40 truncate font-mono text-xs">
            {row.original.transaction_ref}
          </span>
        ),
      },
      {
        accessorKey: "submitted_at",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {new Date(row.original.submitted_at).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        enableSorting: false,
        meta: {
          className: "whitespace-nowrap",
          headerClassName: "whitespace-nowrap",
        },
        cell: ({ row }) => (
          <div className="flex justify-end whitespace-nowrap">
            <ApexApproveRejectActions
              busy={busyId === row.original.id}
              approveConfirmTitle={`Approve ${kind} payment?`}
              approveConfirmDescription={`Verify reference ${row.original.transaction_ref} before approving.`}
              rejectTitle={`Reject ${kind} payment`}
              onApprove={() =>
                act(row.original.id, async () => {
                  if (kind === "setup") {
                    await approveSetupPayment(row.original.pharmacy_tin);
                  } else {
                    await approveQuarterlyPayment(row.original.pharmacy_tin);
                  }
                })
              }
              onReject={(reason) =>
                act(row.original.id, () =>
                  rejectPayment(row.original.id, reason).then(() => undefined),
                )
              }
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, kind],
  );

  return (
    <ConsoleShell>
      <div className="space-y-8">
        <ApexPageHeader
          title={meta.title}
          description={meta.description}
          actions={
            !loading && rows.length > 0 ? (
              <Badge variant="secondary">{rows.length} pending</Badge>
            ) : undefined
          }
        />

        <Panel className="apex-panel-surface overflow-hidden border-border p-0">
          {loading ? (
            <div className="flex min-h-[20vh] items-center justify-center gap-2 text-muted-foreground">
              <Spinner /> Loading queue…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <ApexEmptyState
                icon={meta.icon}
                title={`No pending ${kind} payments`}
                description="New submissions from tenants will appear here."
              />
            </div>
          ) : (
            <ApexDataTable
              data={rows}
              columns={columns}
              noun="payments"
              pageSize={10}
              searchPlaceholder="Search clinic, TIN, transfer ID…"
              tableClassName="min-w-max"
            />
          )}
        </Panel>
      </div>
    </ConsoleShell>
  );
}
