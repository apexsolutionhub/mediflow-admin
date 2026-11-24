"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Search, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ApexCreateTenantDialog } from "@/components/apex/onboarding/ApexCreateTenantDialog";
import { ApexEmptyState, ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import { SubscriptionStatusBadge, TabCountBadge, TenantAccountColumnBadge } from "@/components/apex/StatusBadge";
import { TENANT_STATUSES } from "@/constants/branding";
import { getErrorMessage, isUnauthenticatedError, listTenants } from "@/lib/api";
import { deriveSubscriptionStatus } from "@/lib/analytics";
import type { Tenant } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InactiveStatusFilter = "all" | "suspended" | "banned" | "deleted";

function isInactiveAccount(accountStatus: string) {
  return ["suspended", "banned", "deleted"].includes(
    String(accountStatus || "").toLowerCase(),
  );
}

function TenantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inactiveOnly = searchParams.get("filter") === "inactive";
  const rawInactiveStatus = (searchParams.get("status") || "all").toLowerCase();
  const inactiveStatusFilter: InactiveStatusFilter =
    rawInactiveStatus === "suspended" ||
    rawInactiveStatus === "banned" ||
    rawInactiveStatus === "deleted"
      ? rawInactiveStatus
      : "all";

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allInactive, setAllInactive] = useState<Tenant[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(nextStatus = status) {
    setLoading(true);
    try {
      const data = await listTenants({
        status: inactiveOnly || nextStatus === "all" ? undefined : nextStatus,
      });
      if (inactiveOnly) {
        const inactive = data.filter((t) => isInactiveAccount(t.account_status));
        setAllInactive(inactive);
        const filtered =
          inactiveStatusFilter === "all"
            ? inactive
            : inactive.filter(
                (t) =>
                  String(t.account_status).toLowerCase() === inactiveStatusFilter,
              );
        setTenants(filtered);
      } else {
        setAllInactive([]);
        setTenants(data);
      }
    } catch (err) {
      if (!isUnauthenticatedError(err)) toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const inactiveTabItems = useMemo(
    () => [
      { value: "all" as const, label: "All", count: allInactive.length },
      {
        value: "suspended" as const,
        label: "Suspended",
        count: allInactive.filter(
          (t) => String(t.account_status).toLowerCase() === "suspended",
        ).length,
      },
      {
        value: "banned" as const,
        label: "Banned",
        count: allInactive.filter(
          (t) => String(t.account_status).toLowerCase() === "banned",
        ).length,
      },
      {
        value: "deleted" as const,
        label: "Deleted",
        count: allInactive.filter(
          (t) => String(t.account_status).toLowerCase() === "deleted",
        ).length,
      },
    ],
    [allInactive],
  );

  const visibleTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => {
      const hay = `${t.pharmacy_name} ${t.pharmacy_tin} ${t.manager_username || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tenants, search]);

  const columns = useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        accessorKey: "pharmacy_name",
        header: "Clinic",
        meta: { label: "Clinic" },
        cell: ({ row }) => (
          <Link
            href={`/tenants/${encodeURIComponent(row.original.pharmacy_tin)}`}
            className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
          >
            <span className="block">{row.original.pharmacy_name || "—"}</span>
            {(row.original.branch_count ?? row.original.branches?.length ?? 0) > 1 ? (
              <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                {(row.original.branches || [])
                  .map((b) => b.name)
                  .filter(Boolean)
                  .slice(0, 4)
                  .join(" · ")}
                {(row.original.branches?.length || 0) > 4 ? "…" : ""}
              </span>
            ) : null}
          </Link>
        ),
      },
      {
        accessorKey: "pharmacy_tin",
        header: "TIN",
        meta: { label: "TIN" },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.pharmacy_tin}
          </span>
        ),
      },
      {
        accessorKey: "account_status",
        header: "Account",
        meta: { label: "Account" },
        cell: ({ row }) => <TenantAccountColumnBadge tenant={row.original} />,
      },
      {
        id: "subscription",
        header: "Subscription",
        meta: { label: "Subscription" },
        accessorFn: (row) => deriveSubscriptionStatus(row),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <SubscriptionStatusBadge status={deriveSubscriptionStatus(row.original)} />
            {row.original.billing_hold ? (
              <Badge
                variant="outline"
                className="border-transparent bg-[oklch(0.65_0.1_75/0.15)] text-[oklch(0.92_0.05_75)] ring-1 ring-[oklch(0.65_0.1_75/0.25)]"
              >
                Hold
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "manager_username",
        header: "Admin / Manager",
        meta: { label: "Admin / Manager" },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.manager_username || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactiveOnly, inactiveStatusFilter]);

  return (
    <div className="space-y-8">
      <ApexPageHeader
        title={inactiveOnly ? "Inactive tenants" : "Clinic tenants"}
        description={
          inactiveOnly
            ? "Suspended, banned, and deleted clinics — no MediFlow access while inactive."
            : "Monitor MediFlow clinics and control account access."
        }
        breadcrumbs={
          inactiveOnly
            ? [
                { label: "Tenants", href: "/tenants" },
                { label: "Inactive tenants" },
              ]
            : undefined
        }
        actions={
          !inactiveOnly ? (
            <ApexCreateTenantDialog size="sm" variant="apex" onCreated={() => void load()}>
              Create tenant
            </ApexCreateTenantDialog>
          ) : undefined
        }
      />

      {inactiveOnly ? (
        <Panel className="overflow-hidden p-0">
          <div className="space-y-5 pt-4">
            <Tabs
              value={inactiveStatusFilter}
              onValueChange={(value) => {
                const params = new URLSearchParams();
                params.set("filter", "inactive");
                if (value !== "all") params.set("status", value);
                router.push(`/tenants?${params.toString()}`);
              }}
              className="w-full"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-2.5 rounded-none border-0 bg-transparent p-0 px-4 shadow-none sm:px-5">
                {inactiveTabItems.map((tab) => (
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
                  <ShieldOff className="h-4.5 w-4.5 text-[oklch(0.82_0.05_85)]" />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      Inactive snapshot
                    </p>
                    <Badge variant="secondary">
                      {inactiveStatusFilter === "all"
                        ? "All inactive"
                        : inactiveStatusFilter.charAt(0).toUpperCase() +
                          inactiveStatusFilter.slice(1)}
                    </Badge>
                  </div>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    These clinics cannot sign in until restored from Access control on
                    the tenant detail page.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-500/14 bg-amber-500/6 px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-800">
                    Suspended
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {inactiveTabItems[1]?.count ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-500/14 bg-rose-500/6 px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-rose-200/80">
                    Banned
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {inactiveTabItems[2]?.count ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Deleted
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {inactiveTabItems[3]?.count ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {!loading && allInactive.length > 0 ? (
              <div className="relative mx-4 max-w-xl sm:mx-5">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, TIN, username…"
                  className="h-11 pl-9"
                />
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[20vh] items-center justify-center gap-2 text-muted-foreground">
                <Spinner />
                Loading tenants…
              </div>
            ) : visibleTenants.length === 0 ? (
              <div className="mx-4 mb-4 sm:mx-5">
                <ApexEmptyState
                  icon={ShieldOff}
                  title="No inactive tenants"
                  description={
                    search.trim()
                      ? "Try a different search term."
                      : inactiveStatusFilter === "all"
                        ? "No suspended, banned, or deleted clinics right now."
                        : `No ${inactiveStatusFilter} tenants match this filter.`
                  }
                />
              </div>
            ) : (
              <div className="overflow-hidden border-t border-border">
                <ApexDataTable
                  data={visibleTenants}
                  columns={columns}
                  noun="tenants"
                  searchPlaceholder="Search name, TIN, or manager…"
                  showToolbar={false}
                />
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                void load(value);
              }}
            >
              <SelectTrigger className="h-10 w-45 rounded-xl border-border bg-muted/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {TENANT_STATUSES.map((item) => (
                  <SelectItem key={item.value || "all"} value={item.value || "all"}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Panel className="overflow-hidden">
            {loading ? (
              <div className="flex min-h-[20vh] items-center justify-center gap-2 text-muted-foreground">
                <Spinner />
                Loading tenants…
              </div>
            ) : visibleTenants.length === 0 ? (
              <ApexEmptyState
                icon={Building2}
                title="No tenants found"
                description={
                  search.trim()
                    ? "Try a different search term."
                    : "No clinics match this filter."
                }
              />
            ) : (
              <ApexDataTable
                data={visibleTenants}
                columns={columns}
                noun="tenants"
                searchPlaceholder="Search name, TIN, or manager…"
              />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

export default function TenantsPage() {
  return (
    <ConsoleShell>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner /> Loading tenants…
          </div>
        }
      >
        <TenantsContent />
      </Suspense>
    </ConsoleShell>
  );
}
