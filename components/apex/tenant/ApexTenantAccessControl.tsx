"use client";

import {
  AlertTriangle,
  Ban,
  Pause,
  Shield,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApexConfirmDialog } from "@/components/apex/ApexConfirmDialog";
import { ApexTenantTabShell } from "@/components/apex/tenant/ApexTenantTabShell";
import { TenantAccountColumnBadge } from "@/components/apex/StatusBadge";
import type { Tenant } from "@/lib/types";

type Props = {
  tenant: Tenant;
  branchLabel?: string;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onSuspend: () => void;
  onBan: () => void;
  onUnsuspend: () => void;
  onUnban: () => void;
  onDelete: () => void;
  onRestore: () => void;
};

export function ApexTenantAccessControl({
  tenant,
  branchLabel,
  reason,
  busy,
  onReasonChange,
  onSuspend,
  onBan,
  onUnsuspend,
  onUnban,
  onDelete,
  onRestore,
}: Props) {
  const status = String(tenant.account_status || "").toLowerCase();
  const isActive = status === "active";
  const isSuspended = status === "suspended";
  const isBanned = status === "banned";
  const isDeleted = status === "deleted";
  const reasonReady = Boolean(reason.trim());
  const scopeName = branchLabel || tenant.pharmacy_name || "this branch";

  const stateHint = isDeleted
    ? `Removed from active portfolio — no MediFlow logins for ${scopeName}. Restore to reactivate.`
    : isActive
      ? `${scopeName} staff can sign in normally.`
      : isSuspended
        ? `Temporarily locked — unsuspend to restore ${scopeName}.`
        : `Permanently blocked — unban to restore ${scopeName}.`;

  return (
    <ApexTenantTabShell
      title="Access control"
      description={`Suspend, ban, delete, or restore ${scopeName} — only this branch’s staff logins are affected.`}
      icon={Shield}
      tone="rose"
      actions={<TenantAccountColumnBadge tenant={tenant} />}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Current state
            </p>
            <p className="mt-2 text-sm font-semibold capitalize text-foreground">
              {tenant.account_status}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stateHint}</p>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Status note
            </p>
            {tenant.status_reason ? (
              <p className="text-sm text-muted-foreground">{tenant.status_reason}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No prior enforcement notes.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="access-reason" className="text-sm font-medium">
            Reason
          </Label>
          <Textarea
            id="access-reason"
            placeholder={
              isDeleted
                ? "Optional note when restoring"
                : "Required for suspend, ban, or delete — shown in audit history"
            }
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            className="resize-none"
          />
          {(isActive || isSuspended || isBanned) && !reasonReady ? (
            <p className="flex items-center gap-1.5 text-xs text-[oklch(0.82_0.06_75)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Enter a reason before suspending, banning, or deleting.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {isDeleted ? (
              <ApexConfirmDialog
              title={`Restore ${scopeName}?`}
              description={`Staff logins for ${scopeName} will be re-enabled according to billing and access state.`}
              confirmLabel="Restore branch"
              destructive={false}
              disabled={busy}
              onConfirm={onRestore}
              trigger={
                <Button
                  size="sm"
                  variant="success"
                  className="apex-row-action gap-1.5"
                  disabled={busy}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Restore tenant
                </Button>
              }
            />
          ) : isActive ? (
            <>
              <ApexConfirmDialog
                title={`Suspend ${scopeName}?`}
                description={
                  reasonReady
                    ? `Staff logins for ${scopeName} will be blocked until you unsuspend. Reason: ${reason.trim()}`
                    : `Staff logins for ${scopeName} will be blocked until you unsuspend.`
                }
                confirmLabel="Suspend branch"
                disabled={busy || !reasonReady}
                onConfirm={onSuspend}
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="apex-row-action gap-1.5"
                    disabled={busy || !reasonReady}
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Suspend
                  </Button>
                }
              />
              <ApexConfirmDialog
                title={`Ban ${scopeName}?`}
                description={
                  reasonReady
                    ? `Permanent access block for ${scopeName} until unbanned. Reason: ${reason.trim()}`
                    : `Permanent access block for ${scopeName} until unbanned.`
                }
                confirmLabel="Ban branch"
                disabled={busy || !reasonReady}
                onConfirm={onBan}
                trigger={
                  <Button
                    size="sm"
                    variant="destructive"
                    className="apex-row-action gap-1.5"
                    disabled={busy || !reasonReady}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Ban clinic
                  </Button>
                }
              />
              <ApexConfirmDialog
                title={`Delete ${scopeName}?`}
                description={
                  reasonReady
                    ? `Marks ${scopeName} as deleted and blocks its logins. Reason: ${reason.trim()}`
                    : `Marks ${scopeName} as deleted and blocks its logins.`
                }
                confirmLabel="Delete branch"
                disabled={busy || !reasonReady}
                onConfirm={onDelete}
                trigger={
                  <Button
                    size="sm"
                    variant="destructive"
                    className="apex-row-action gap-1.5"
                    disabled={busy || !reasonReady}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete tenant
                  </Button>
                }
              />
            </>
          ) : isSuspended ? (
            <>
              <ApexConfirmDialog
                title={`Unsuspend ${scopeName}?`}
                description={`Staff for ${scopeName} can sign in again if billing and setup status allow it.`}
                confirmLabel="Unsuspend"
                destructive={false}
                disabled={busy}
                onConfirm={onUnsuspend}
                trigger={
                  <Button
                    size="sm"
                    variant="success"
                    className="apex-row-action gap-1.5"
                    disabled={busy}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Unsuspend
                  </Button>
                }
              />
              <ApexConfirmDialog
                title={`Delete ${scopeName}?`}
                description={
                  reasonReady
                    ? `Marks ${scopeName} as deleted. Reason: ${reason.trim()}`
                    : `Marks ${scopeName} as deleted.`
                }
                confirmLabel="Delete branch"
                disabled={busy || !reasonReady}
                onConfirm={onDelete}
                trigger={
                  <Button
                    size="sm"
                    variant="destructive"
                    className="apex-row-action gap-1.5"
                    disabled={busy || !reasonReady}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete tenant
                  </Button>
                }
              />
            </>
          ) : (
            <>
              <ApexConfirmDialog
                title={`Unban ${scopeName}?`}
                description={`Removes the ban so ${scopeName} staff can sign in again when billing allows.`}
                confirmLabel="Unban"
                destructive={false}
                disabled={busy}
                onConfirm={onUnban}
                trigger={
                  <Button
                    size="sm"
                    variant="success"
                    className="apex-row-action gap-1.5"
                    disabled={busy}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Unban
                  </Button>
                }
              />
              <ApexConfirmDialog
                title={`Delete ${scopeName}?`}
                description={
                  reasonReady
                    ? `Marks ${scopeName} as deleted. Reason: ${reason.trim()}`
                    : `Marks ${scopeName} as deleted.`
                }
                confirmLabel="Delete branch"
                disabled={busy || !reasonReady}
                onConfirm={onDelete}
                trigger={
                  <Button
                    size="sm"
                    variant="destructive"
                    className="apex-row-action gap-1.5"
                    disabled={busy || !reasonReady}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete tenant
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>
    </ApexTenantTabShell>
  );
}
