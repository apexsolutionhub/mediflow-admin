"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { ApexConfirmDialog } from "@/components/apex/ApexConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ApexTenantTabShell } from "@/components/apex/tenant/ApexTenantTabShell";
import { ApexEmptyState } from "@/components/apex/PageChrome";
import type { TenantStaff } from "@/lib/types";

type Props = {
  staff: TenantStaff[];
  branchLabel?: string;
  busy: boolean;
  onToggleLogin: (userId: number, wasDisabled: boolean) => void;
};

export function ApexTenantStaffTable({ staff, branchLabel, busy, onToggleLogin }: Props) {
  const disabledCount = staff.filter((u) => u.login_disabled).length;
  const columns = useMemo<ColumnDef<TenantStaff>[]>(
    () => [
      {
        accessorKey: "username",
        header: "Username",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.username}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">
            {row.original.role || "—"}
          </span>
        ),
      },
      {
        accessorKey: "branch_name",
        header: "Branch",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.branch_name || branchLabel || "—"}
          </span>
        ),
      },
      {
        accessorKey: "login_disabled",
        header: "Login",
        cell: ({ row }) =>
          row.original.login_disabled ? (
            <Badge variant="destructive">Disabled</Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          ),
        sortingFn: (a, b) =>
          Number(a.original.login_disabled) - Number(b.original.login_disabled),
      },
      {
        id: "action",
        header: () => <div className="text-right">Action</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const disabled = Boolean(row.original.login_disabled);
          return (
            <div className="text-right">
              <ApexConfirmDialog
                title={disabled ? "Enable staff login?" : "Disable staff login?"}
                description={
                  disabled
                    ? `${row.original.username} will be able to sign in again immediately.`
                    : `${row.original.username} will be blocked from signing in until re-enabled.`
                }
                confirmLabel={disabled ? "Enable login" : "Disable login"}
                destructive={!disabled}
                disabled={busy}
                onConfirm={() => onToggleLogin(row.original.id, disabled)}
                trigger={
                  <Button
                    size="sm"
                    variant={disabled ? "success" : "destructive"}
                    className="apex-row-action"
                    disabled={busy}
                  >
                    {disabled ? "Enable" : "Disable"}
                  </Button>
                }
              />
            </div>
          );
        },
      },
    ],
    [busy, onToggleLogin, branchLabel],
  );

  return (
    <ApexTenantTabShell
      title="Staff accounts"
      description={
        branchLabel
          ? `Staff for ${branchLabel}. Emergency per-user login disable — does not change roles or passwords.`
          : "Emergency per-user login disable — does not change roles or passwords."
      }
      icon={Users}
      tone="emerald"
      contentClassName="px-0 py-0"
      actions={
        disabledCount > 0 ? (
          <Badge variant="destructive">{disabledCount} disabled</Badge>
        ) : (
          <Badge variant="success">All active</Badge>
        )
      }
    >
      {staff.length === 0 ? (
        <div className="px-5 py-5 sm:px-6">
          <ApexEmptyState
            icon={Users}
            title="No staff accounts"
            description={
              branchLabel
                ? `No staff found for ${branchLabel}.`
                : "Staff will appear here once created for this clinic."
            }
          />
        </div>
      ) : (
        <ApexDataTable
          data={staff}
          columns={columns}
          noun="staff accounts"
          pageSize={10}
        />
      )}
    </ApexTenantTabShell>
  );
}
