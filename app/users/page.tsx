"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ApexEmptyState, ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import {
  ApexTenantUsersDetailTrigger,
  tenantStandingLabel,
  tenantUsersMetaLine,
  type TenantUsersBranchGroup,
  type TenantUsersGroup,
} from "@/components/apex/tenant/ApexTenantUsersDetailTrigger";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage, isUnauthenticatedError, listTenants, listTenantUsers } from "@/lib/api";
import { deriveSubscriptionStatus } from "@/lib/analytics";
import type { Tenant, TenantBranchSummary, TenantUserRow } from "@/lib/types";

function titleCaseRole(role: string) {
  return role
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function uniqueRoles(users: TenantUserRow[]) {
  return [
    ...new Set(
      users
        .map((u) => titleCaseRole(String(u.role || "").trim()))
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function buildBranchBuckets(
  orgTin: string,
  orgName: string,
  declared: TenantBranchSummary[] | undefined,
  users: TenantUserRow[],
): TenantUsersBranchGroup[] {
  const byTin = new Map<string, TenantUserRow[]>();
  for (const user of users) {
    const tin = String(user.pharmacy_tin || "").trim() || orgTin;
    const list = byTin.get(tin);
    if (list) list.push(user);
    else byTin.set(tin, [user]);
  }

  const branches: TenantUsersBranchGroup[] = [];
  const seen = new Set<string>();

  const declaredSorted = [...(declared || [])].sort((a, b) => {
    if (Boolean(a.is_main) !== Boolean(b.is_main)) return a.is_main ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const branch of declaredSorted) {
    const tin = (branch.branch_tin || orgTin).trim() || orgTin;
    seen.add(tin.toLowerCase());
    const branchUsers = byTin.get(tin) || [];
    // Also pull users keyed under case variants
    for (const [key, list] of byTin) {
      if (key.toLowerCase() === tin.toLowerCase() && key !== tin) {
        branchUsers.push(...list);
      }
    }
    branches.push({
      name: branch.name || orgName,
      tin,
      isMain: Boolean(branch.is_main),
      roles: uniqueRoles(branchUsers),
      userCount: branchUsers.length,
      disabledCount: branchUsers.filter((u) => u.login_disabled).length,
      users: branchUsers,
    });
  }

  for (const [tin, branchUsers] of byTin) {
    if (seen.has(tin.toLowerCase())) continue;
    const sample = branchUsers[0];
    branches.push({
      name:
        sample?.branch_name ||
        (tin.toLowerCase() === orgTin.toLowerCase() ? orgName : tin),
      tin,
      isMain: Boolean(sample?.is_main_branch) || tin.toLowerCase() === orgTin.toLowerCase(),
      roles: uniqueRoles(branchUsers),
      userCount: branchUsers.length,
      disabledCount: branchUsers.filter((u) => u.login_disabled).length,
      users: branchUsers,
    });
  }

  if (branches.length === 0) {
    branches.push({
      name: orgName,
      tin: orgTin,
      isMain: true,
      roles: uniqueRoles(users),
      userCount: users.length,
      disabledCount: users.filter((u) => u.login_disabled).length,
      users,
    });
  }

  return branches.sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function groupUsersByOrganization(
  users: TenantUserRow[],
  tenantsByTin: Map<string, Tenant>,
): TenantUsersGroup[] {
  const byOrg = new Map<string, TenantUserRow[]>();
  for (const user of users) {
    const orgTin =
      String(user.org_tin || "").trim() ||
      String(user.pharmacy_tin || "").trim();
    if (!orgTin) continue;
    const list = byOrg.get(orgTin);
    if (list) list.push(user);
    else byOrg.set(orgTin, [user]);
  }

  const groups: TenantUsersGroup[] = [];
  for (const [pharmacy_tin, groupUsers] of byOrg) {
    const tenant = tenantsByTin.get(pharmacy_tin);
    const pharmacy_name =
      tenant?.pharmacy_name ||
      groupUsers.find((u) => u.org_tin === pharmacy_tin)?.pharmacy_name ||
      groupUsers[0]?.pharmacy_name ||
      pharmacy_tin;

    const branches = buildBranchBuckets(
      pharmacy_tin,
      pharmacy_name,
      tenant?.branches,
      groupUsers,
    );
    const roles = uniqueRoles(groupUsers);
    const subscriptionStatus = tenant ? deriveSubscriptionStatus(tenant) : null;
    const standingLabel = tenantStandingLabel({
      accountStatus: tenant?.account_status,
      subscriptionStatus,
      isIllustration: Boolean(tenant?.is_illustration),
    });

    groups.push({
      pharmacy_tin,
      pharmacy_name,
      roleCount: roles.length,
      roles,
      userCount: groupUsers.length,
      disabledCount: groupUsers.filter((u) => u.login_disabled).length,
      pays: standingLabel === "Pays",
      standingLabel,
      subscriptionStatus,
      accountStatus: tenant?.account_status ?? null,
      is_illustration: Boolean(tenant?.is_illustration),
      users: groupUsers,
      branches,
    });
  }

  return groups.sort((a, b) =>
    a.pharmacy_name.localeCompare(b.pharmacy_name, undefined, {
      sensitivity: "base",
    }),
  );
}

export default function UsersPage() {
  const [groups, setGroups] = useState<TenantUsersGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [users, tenants] = await Promise.all([
          listTenantUsers(),
          listTenants(),
        ]);
        const tenantsByTin = new Map(
          tenants.map((t) => [String(t.pharmacy_tin).trim(), t] as const),
        );
        setGroups(groupUsersByOrganization(users, tenantsByTin));
      } catch (err) {
        if (!isUnauthenticatedError(err)) toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = useMemo<ColumnDef<TenantUsersGroup>[]>(
    () => [
      {
        accessorKey: "pharmacy_name",
        header: "Tenant",
        cell: ({ row }) => (
          <ApexTenantUsersDetailTrigger
            group={row.original}
            className="-mx-1 px-1 py-0.5"
          >
            <div className="flex max-w-xs flex-col gap-0.5">
              <span className="font-medium wrap-break-word underline-offset-2 group-hover/detail:underline">
                {row.original.pharmacy_name}
              </span>
              <span className="text-[10px] leading-snug text-muted-foreground wrap-break-word">
                {tenantUsersMetaLine(row.original)}
              </span>
              {row.original.branches.length > 1 ? (
                <span className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/90">
                  {row.original.branches.map((b) => b.name).join(" · ")}
                </span>
              ) : null}
            </div>
          </ApexTenantUsersDetailTrigger>
        ),
      },
      {
        id: "branches",
        header: "Branches",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {row.original.branches.length}
          </span>
        ),
      },
      {
        accessorKey: "userCount",
        header: "Users",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {row.original.userCount}
          </span>
        ),
      },
      {
        accessorKey: "disabledCount",
        header: "Login",
        cell: ({ row }) =>
          row.original.disabledCount > 0 ? (
            <Badge variant="destructive">
              {row.original.disabledCount} disabled
            </Badge>
          ) : (
            <Badge variant="success">All active</Badge>
          ),
      },
      {
        accessorKey: "pharmacy_tin",
        header: "TIN",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.pharmacy_tin}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <ApexPageHeader
          title="Tenant users"
          description="Staff accounts grouped by organization — hover multi-branch clinics to preview each site"
        />

        <Panel>
          {loading ? (
            <div className="flex min-h-[20vh] items-center justify-center gap-2 text-muted-foreground">
              <Spinner /> Loading users…
            </div>
          ) : groups.length === 0 ? (
            <ApexEmptyState
              icon={Users}
              title="No users found"
              description="Staff accounts will appear here once clinics are created."
            />
          ) : (
            <ApexDataTable
              data={groups}
              columns={columns}
              noun="organizations"
              searchPlaceholder="Search clinic, TIN, branch, standing…"
              pageSize={10}
            />
          )}
        </Panel>
      </div>
    </ConsoleShell>
  );
}
