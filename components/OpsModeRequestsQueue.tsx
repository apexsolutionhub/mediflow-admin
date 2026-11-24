"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Server } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexApproveRejectActions } from "@/components/apex/ApexApproveRejectActions";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ClinicServerDialog } from "@/components/apex/ClinicServerDialog";
import { OpsModePill, OpsModeStatusBadge } from "@/components/apex/OpsModePill";
import { ApexEmptyState, ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  CLINIC_OPS_MODE_LABELS,
  type ClinicOpsMode,
} from "@/lib/clinicOpsMode";
import {
  approveOpsModeRequest,
  getErrorMessage,
  isUnauthenticatedError,
  listOpsModeRequests,
  rejectOpsModeRequest,
} from "@/lib/api";
import type { OpsModeChangeRequest } from "@/lib/types";

function serverText(row: OpsModeChangeRequest) {
  const server = row.server;
  if (!server || server.active_nodes === 0) return "No token issued";
  if (!server.seeded_at) return "Token issued · not seeded";
  const last = server.last_successful_sync_at;
  return `Seeded · last sync ${last ? new Date(last).toLocaleDateString() : "never"}`;
}

function ModeTransition({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <OpsModePill mode={from} />
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      <OpsModePill mode={to} />
    </div>
  );
}

export function OpsModeRequestsQueue() {
  const [rows, setRows] = useState<OpsModeChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [serverTin, setServerTin] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setRows(await listOpsModeRequests(filter));
    } catch (err) {
      if (!isUnauthenticatedError(err)) toast.error(getErrorMessage(err));
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
    const onRefresh = () => void load(true);
    window.addEventListener("apex:refresh", onRefresh);
    return () => window.removeEventListener("apex:refresh", onRefresh);
  }, [load]);

  const act = async (id: number, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      toast.success("Request updated");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows],
  );

  const columns = useMemo<ColumnDef<OpsModeChangeRequest>[]>(
    () => [
      {
        accessorKey: "pharmacy_name",
        header: "Clinic",
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <Link
              href={`/tenants/${encodeURIComponent(row.original.pharmacy_tin)}`}
              className="font-medium transition-colors hover:text-[oklch(0.82_0.04_85)]"
            >
              {row.original.pharmacy_name || "—"}
            </Link>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {row.original.pharmacy_tin}
            </p>
          </div>
        ),
      },
      {
        id: "transition",
        header: "Requested change",
        cell: ({ row }) => (
          <ModeTransition
            from={row.original.current_ops_mode}
            to={row.original.requested_ops_mode}
          />
        ),
      },
      {
        accessorKey: "request_note",
        header: "Manager note",
        meta: { label: "Note" },
        cell: ({ row }) => (
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {row.original.request_note?.trim() || "—"}
          </p>
        ),
      },
      {
        accessorKey: "requested_by_username",
        header: "Requested by",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.requested_by_username || "—"}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {new Date(row.original.created_at).toLocaleString()}
          </span>
        ),
      },
      ...(filter !== "pending"
        ? [
            {
              id: "server",
              header: "Clinic server",
              enableSorting: false,
              cell: ({ row }: { row: { original: OpsModeChangeRequest } }) => (
                <span className="whitespace-nowrap text-xs text-muted-foreground">{serverText(row.original)}</span>
              ),
            } as ColumnDef<OpsModeChangeRequest>,
            {
              accessorKey: "status",
              header: "Status",
              cell: ({ row }: { row: { original: OpsModeChangeRequest } }) => (
                <div className="space-y-1">
                  <OpsModeStatusBadge status={row.original.status} awaitingStep={row.original.awaiting_step} />
                  {row.original.review_note ? (
                    <p className="max-w-[14rem] text-[11px] leading-relaxed text-muted-foreground">
                      {row.original.review_note}
                    </p>
                  ) : null}
                </div>
              ),
            } as ColumnDef<OpsModeChangeRequest>,
          ]
        : []),
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.status !== "pending") {
            const hasServer = row.original.status === "approved" || row.original.status === "applied";
            return (
              <div className="flex items-center justify-end gap-2">
                {filter === "pending" ? (
                  <OpsModeStatusBadge status={row.original.status} awaitingStep={row.original.awaiting_step} />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {row.original.reviewed_at
                      ? new Date(row.original.reviewed_at).toLocaleDateString()
                      : "—"}
                  </span>
                )}
                {hasServer ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setServerTin(row.original.pharmacy_tin)}
                  >
                    <Server className="size-4" />
                    Clinic server
                  </Button>
                ) : null}
              </div>
            );
          }
          return (
            <div className="flex justify-end whitespace-nowrap">
              <ApexApproveRejectActions
                busy={busyId === row.original.id}
                approveLabel="Approve"
                rejectTitle="Reject ops mode request"
                rejectDescription="The manager will see your reason and the clinic stays in its current mode."
                onApprove={() =>
                  act(row.original.id, () =>
                    approveOpsModeRequest(row.original.id).then(() => undefined),
                  )
                }
                onReject={(reason) =>
                  act(row.original.id, () =>
                    rejectOpsModeRequest(row.original.id, reason).then(() => undefined),
                  )
                }
              />
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, filter],
  );

  return (
    <ConsoleShell>
      <div className="space-y-8">
        <ApexPageHeader
          title="Ops mode requests"
          description="Managers request mode changes. Approving never switches a clinic by itself: going offline waits for the clinic server's initial seed, going online waits for its final sync."
          actions={
            !loading && filter === "pending" && pendingCount > 0 ? (
              <Badge variant="secondary">{pendingCount} pending</Badge>
            ) : undefined
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel className="apex-panel-surface border-border p-5 lg:col-span-2">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.55_0.04_85/0.12)] ring-1 ring-[oklch(0.62_0.04_85/0.22)]">
                <Server className="size-5 text-[oklch(0.86_0.03_85)]" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold">How approvals work</p>
                <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Online → offline</strong> — after you
                    approve, issue the clinic server&apos;s token (Clinic server button). The clinic
                    installs its server and runs the initial seed; offline mode starts when the seed
                    completes. Until then the clinic keeps working on the cloud.
                  </li>
                  <li>
                    <strong className="text-foreground">Offline → online</strong> — after you
                    approve, the manager must run a full sync (push + pull) before cloud mode is
                    active.
                  </li>
                </ul>
              </div>
            </div>
          </Panel>
          <Panel className="apex-panel-surface border-border p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mode reference
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(Object.keys(CLINIC_OPS_MODE_LABELS) as ClinicOpsMode[]).map((mode) => (
                <li key={mode} className="flex items-center gap-2">
                  <OpsModePill mode={mode} />
                  <span className="text-xs">{CLINIC_OPS_MODE_LABELS[mode]}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "approved" ? "default" : "outline"}
            onClick={() => setFilter("approved")}
          >
            Waiting for clinic
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All requests
          </Button>
        </div>

        <Panel className="apex-panel-surface overflow-hidden border-border p-0">
          {loading ? (
            <div className="flex min-h-[20vh] items-center justify-center gap-2 text-muted-foreground">
              <Spinner /> Loading queue…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <ApexEmptyState
                icon={Server}
                title={
                  filter === "pending"
                    ? "No pending ops mode requests"
                    : filter === "approved"
                      ? "No clinics are waiting for a seed or sync"
                      : "No requests found"
                }
                description="When a clinic manager requests an online or offline change, it appears here for Apex review."
              />
            </div>
          ) : (
            <ApexDataTable
              data={rows}
              columns={columns}
              noun="requests"
              pageSize={10}
              searchPlaceholder="Search clinic, TIN, manager…"
              tableClassName="min-w-max"
            />
          )}
        </Panel>
      </div>

      <ClinicServerDialog
        tin={serverTin}
        open={serverTin !== null}
        onOpenChange={(open) => (!open ? setServerTin(null) : undefined)}
        onChanged={() => void load(true)}
      />
    </ConsoleShell>
  );
}
