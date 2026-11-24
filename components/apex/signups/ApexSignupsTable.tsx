"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ApexApproveRejectActions } from "@/components/apex/ApexApproveRejectActions";
import { SignupReviewStatusBadge, TabCountBadge } from "@/components/apex/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  approveSetupPayment,
  getErrorMessage,
  rejectPayment,
} from "@/lib/api";
import type { SignupReviewStatus, SignupRow } from "@/lib/types";
import { ApexEmptyState } from "@/components/apex/PageChrome";

type StatusFilter = SignupReviewStatus | "all";

type Props = {
  rows: SignupRow[];
  onChanged: () => void;
};

type ColumnMeta = {
  className?: string;
  headerClassName?: string;
};

function currentMonthLabel() {
  return new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function ApexSignupsTable({ rows, onChanged }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyTin, setBusyTin] = useState<string | null>(null);

  const tabItems = useMemo(
    () => [
      { value: "all" as const, label: "All", count: rows.length },
      {
        value: "pending" as const,
        label: "Pending",
        count: rows.filter((row) => row.status === "pending").length,
      },
      {
        value: "approved" as const,
        label: "Approved",
        count: rows.filter((row) => row.status === "approved").length,
      },
      {
        value: "rejected" as const,
        label: "Rejected",
        count: rows.filter((row) => row.status === "rejected").length,
      },
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const snapshot = useMemo(() => {
    const pending = rows.filter((row) => row.status === "pending").length;
    const approved = rows.filter((row) => row.status === "approved").length;
    const rejected = rows.filter((row) => row.status === "rejected").length;
    return { pending, approved, rejected };
  }, [rows]);

  const runAction = async (
    tin: string,
    fn: () => Promise<void>,
    successMsg: string,
  ) => {
    setBusyTin(tin);
    try {
      await fn();
      toast.success(successMsg);
      onChanged();
    } catch (e) {
      toast.error(getErrorMessage(e) || "Action failed");
    } finally {
      setBusyTin(null);
    }
  };

  const columns = useMemo<ColumnDef<SignupRow>[]>(
    () => [
      {
        accessorKey: "pharmacy_name",
        header: "Clinic",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/tenants/${encodeURIComponent(row.original.pharmacy_tin)}`}
              className="font-medium hover:text-primary hover:underline"
            >
              {row.original.pharmacy_name}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">
              {row.original.pharmacy_tin}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "manager_username",
        header: "Admin / Manager",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.manager_username || "—"}</span>
        ),
      },
      {
        accessorKey: "setup_fee_etb",
        header: "Setup fee",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.setup_fee_etb.toLocaleString()} ETB
          </span>
        ),
      },
      {
        accessorKey: "payment_transaction_ref",
        header: "Payment ref",
        cell: ({ row }) => (
          <div className="font-mono text-xs">
            {row.original.payment_transaction_ref || "—"}
            {row.original.payment_channel ? (
              <span className="block text-muted-foreground">
                {row.original.payment_channel}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        minSize: 110,
        meta: {
          className: "whitespace-nowrap",
          headerClassName: "whitespace-nowrap",
        } satisfies ColumnMeta,
        cell: ({ row }) => <SignupReviewStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "created_at",
        header: "Registered",
        cell: ({ row }) => {
          const waitMins = Math.floor(
            (Date.now() - new Date(row.original.created_at).getTime()) / 60000,
          );
          return (
            <div className="text-sm text-muted-foreground">
              {new Date(row.original.created_at).toLocaleString()}
              {row.original.status === "pending" ? (
                <Badge
                  variant={waitMins > 45 ? "warning" : "secondary"}
                  className="mt-1.5 block w-fit text-[10px]"
                >
                  Waiting {waitMins} min
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "action",
        header: () => <div className="text-right">Action</div>,
        enableSorting: false,
        minSize: 220,
        meta: {
          className: "whitespace-nowrap",
          headerClassName: "whitespace-nowrap",
          label: "Action",
        } satisfies ColumnMeta & { label: string },
        cell: ({ row }) => {
          if (row.original.status !== "pending") {
            return <div className="text-right text-xs text-muted-foreground">—</div>;
          }
          const canReview =
            row.original.pending_setup_payment_id != null ||
            Boolean(row.original.payment_transaction_ref) ||
            row.original.has_pending_submission;
          if (!canReview) {
            return (
              <div className="text-right text-xs text-muted-foreground">
                Awaiting payment
              </div>
            );
          }
          const isBusy = busyTin === row.original.pharmacy_tin;
          return (
            <div className="flex justify-end whitespace-nowrap">
              <ApexApproveRejectActions
                busy={isBusy}
                approveLabel="Approve setup"
                approveConfirmTitle="Approve setup payment?"
                approveConfirmDescription="Verify the transfer reference before approving. The clinic can sign in after approval."
                rejectTitle="Reject setup payment"
                rejectDescription="The clinic will need to resubmit payment with a corrected reference."
                rejectDisabled={row.original.pending_setup_payment_id == null}
                approveDisabled={row.original.pending_setup_payment_id == null}
                onApprove={() =>
                  void runAction(
                    row.original.pharmacy_tin,
                    async () => {
                      await approveSetupPayment(row.original.pharmacy_tin);
                    },
                    "Setup approved — tenant can log in",
                  )
                }
                onReject={(reason) =>
                  void runAction(
                    row.original.pharmacy_tin,
                    async () => {
                      const id = row.original.pending_setup_payment_id;
                      if (id == null) {
                        throw new Error("No pending setup payment to reject");
                      }
                      await rejectPayment(id, reason);
                    },
                    "Setup rejected",
                  )
                }
              />
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyTin, onChanged],
  );

  return (
    <div className="space-y-5 pt-4">
      <Tabs
        value={statusFilter}
        onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        className="w-full"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2.5 rounded-none border-0 bg-transparent p-0 px-4 shadow-none sm:px-5">
          {tabItems.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="apex-tabs-trigger h-11 flex-none gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-left leading-none shadow-sm transition-all duration-150 hover:border-border hover:bg-muted/60 data-[state=active]:border-primary/30 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <span className="text-sm font-medium tracking-tight">{tab.label}</span>
              <TabCountBadge count={tab.count} />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mx-4 flex flex-col gap-4 rounded-2xl border border-border bg-linear-to-r from-background/95 via-background/82 to-background/95 px-4 py-4 shadow-sm sm:mx-5 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-[oklch(0.68_0.05_85/0.16)] bg-[oklch(0.68_0.05_85/0.08)] p-2.5">
            <UserPlus className="h-4.5 w-4.5 text-[oklch(0.82_0.05_85)]" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Signup snapshot
              </p>
              <Badge variant="secondary">{currentMonthLabel()}</Badge>
              <Badge variant="outline">
                {statusFilter === "all"
                  ? "All statuses"
                  : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Clinics that signed up this month — review pending setup fees, then
              track approved and rejected outcomes.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/14 bg-amber-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-800">
              Pending review
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.pending}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Waiting for Apex action</p>
          </div>
          <div className="rounded-xl border border-emerald-500/14 bg-emerald-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
              Approved
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.approved}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Setup fee cleared this month
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/14 bg-rose-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-rose-200/80">
              Rejected
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.rejected}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Need a corrected payment resubmit
            </p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-4 mb-4 sm:mx-5">
          <ApexEmptyState
            icon={UserPlus}
            title="No signups"
            description={
              statusFilter === "pending"
                ? "No pending setup reviews for this month right now."
                : statusFilter === "all"
                  ? "No clinics signed up this month yet."
                  : "No signups match this filter."
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden border-t border-border">
          <ApexDataTable
            data={filtered}
            columns={columns}
            noun="signups"
            pageSize={10}
            searchPlaceholder="Search clinic, TIN, manager…"
            tableClassName="min-w-max"
          />
        </div>
      )}
    </div>
  );
}
