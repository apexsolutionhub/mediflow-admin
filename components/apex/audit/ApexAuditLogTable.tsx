"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, FileText, Shield, UserRound } from "lucide-react";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { TabCountBadge } from "@/components/apex/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditLogRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type AuditCategory =
  | "all"
  | "billing"
  | "access"
  | "pricing"
  | "chat"
  | "other";

type Props = {
  rows: AuditLogRow[];
};

type ColumnMeta = {
  className?: string;
  headerClassName?: string;
};

const BILLING_ACTIONS = new Set([
  "approve_setup",
  "approve_setup_payment",
  "reject_setup",
  "reject_payment",
  "approve_quarterly",
  "approve_quarterly_payment",
  "approve_yearly",
  "approve_yearly_payment",
  "release_billing_hold",
  "set_billing_hold",
  "update_tenant_billing",
  "create_tenant",
]);

const ACCESS_ACTIONS = new Set([
  "suspend_tenant",
  "unsuspend_tenant",
  "ban_tenant",
  "unban_tenant",
  "delete_tenant",
  "restore_tenant",
  "set_user_login_disabled",
  "disable_user_login",
  "enable_user_login",
]);

const PRICING_ACTIONS = new Set([
  "upsert_pricing_rule",
  "set_pricing_rule_active",
  "delete_pricing_rule",
  "approve_module_change",
  "reject_module_change",
  "update_tenant_modules",
]);

const CHAT_ACTIONS = new Set([
  "broadcast_chat",
  "send_feedback",
  "close_feedback_thread",
]);

function formatAction(action: string) {
  return action.replace(/_/g, " ");
}

function categorizeAction(action: string): Exclude<AuditCategory, "all"> {
  if (BILLING_ACTIONS.has(action)) return "billing";
  if (ACCESS_ACTIONS.has(action)) return "access";
  if (PRICING_ACTIONS.has(action)) return "pricing";
  if (CHAT_ACTIONS.has(action)) return "chat";
  return "other";
}

function formatWhen(value: string) {
  try {
    const date = new Date(value);
    return {
      day: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { day: value, time: "" };
  }
}

function memberInitials(name: string | null) {
  if (!name?.trim()) return "AP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "AP";
}

function metadataUserId(row: AuditLogRow): number | null {
  const raw = row.metadata?.user_id ?? row.metadata?.target_user_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ActionPill({ action }: { action: string }) {
  const category = categorizeAction(action);
  const variant =
    category === "billing"
      ? "success"
      : category === "access"
        ? "warning"
        : category === "pricing"
          ? "secondary"
          : category === "chat"
            ? "outline"
            : "outline";
  return (
    <Badge
      variant={variant}
      className="max-w-full text-center capitalize wrap-break-word whitespace-normal"
      title={formatAction(action)}
    >
      {formatAction(action)}
    </Badge>
  );
}

export function ApexAuditLogTable({ rows }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>("all");

  const tabItems = useMemo(() => {
    const counts = {
      all: rows.length,
      billing: 0,
      access: 0,
      pricing: 0,
      chat: 0,
      other: 0,
    };
    for (const row of rows) {
      counts[categorizeAction(row.action)] += 1;
    }
    return [
      { value: "all" as const, label: "All", count: counts.all },
      { value: "billing" as const, label: "Billing", count: counts.billing },
      { value: "access" as const, label: "Access", count: counts.access },
      { value: "pricing" as const, label: "Pricing", count: counts.pricing },
      { value: "chat" as const, label: "Chat", count: counts.chat },
      { value: "other" as const, label: "Other", count: counts.other },
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return rows;
    return rows.filter((row) => categorizeAction(row.action) === categoryFilter);
  }, [rows, categoryFilter]);

  const snapshot = useMemo(() => {
    const withTenant = rows.filter((row) => Boolean(row.pharmacy_tin?.trim())).length;
    const withDetail = rows.filter((row) => Boolean(row.detail?.trim())).length;
    return {
      total: rows.length,
      withTenant,
      withDetail,
    };
  }, [rows]);

  const columns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "When",
        meta: {
          className: "whitespace-normal overflow-hidden",
          headerClassName: "whitespace-nowrap",
        } satisfies ColumnMeta,
        cell: ({ row }) => {
          const when = formatWhen(row.original.created_at);
          return (
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{when.day}</p>
              {when.time ? (
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {when.time}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "action",
        header: "Action",
        meta: {
          className: "whitespace-normal overflow-hidden text-center",
          headerClassName: "whitespace-nowrap text-center",
        } satisfies ColumnMeta,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <ActionPill action={row.original.action} />
          </div>
        ),
      },
      {
        id: "target",
        header: "Target",
        meta: {
          className: "whitespace-normal overflow-hidden",
          headerClassName: "whitespace-nowrap",
        } satisfies ColumnMeta,
        cell: ({ row }) => {
          const tin = row.original.pharmacy_tin?.trim();
          const userId = metadataUserId(row.original);
          if (tin) {
            return (
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <div className="min-w-0 space-y-1 overflow-hidden">
                  <Link
                    href={`/tenants/${encodeURIComponent(tin)}`}
                    className="block truncate font-mono text-xs font-semibold text-foreground transition-colors hover:text-[oklch(0.82_0.04_85)]"
                    title={tin}
                  >
                    {tin}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">Clinic TIN</p>
                </div>
              </div>
            );
          }
          if (userId) {
            return (
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    User #{userId}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Staff account</p>
                </div>
              </div>
            );
          }
          return <span className="text-sm text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: "actor_username",
        header: "By",
        meta: {
          className: "whitespace-normal overflow-hidden",
          headerClassName: "whitespace-nowrap",
        } satisfies ColumnMeta,
        cell: ({ row }) => {
          const name = row.original.actor_username?.trim() || null;
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-[10px] font-semibold tracking-wide text-muted-foreground">
                {memberInitials(name)}
              </span>
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  {name || "Apex"}
                </p>
                <p className="text-[11px] text-muted-foreground">Team member</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "detail",
        header: "Detail",
        meta: {
          className: "whitespace-normal overflow-hidden pl-4",
          headerClassName: "whitespace-nowrap pl-4",
        } satisfies ColumnMeta,
        cell: ({ row }) => {
          const detail = row.original.detail?.trim();
          if (!detail) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <p
              className="line-clamp-2 max-w-72 text-sm leading-relaxed wrap-break-word text-muted-foreground"
              title={detail}
            >
              {detail}
            </p>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <Tabs
        value={categoryFilter}
        onValueChange={(value) => setCategoryFilter(value as AuditCategory)}
        className="w-full"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2.5 rounded-none border-0 bg-transparent p-0 pl-4 shadow-none sm:pl-5">
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

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-linear-to-r from-background/95 via-background/82 to-background/95 px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-[oklch(0.68_0.05_85/0.16)] bg-[oklch(0.68_0.05_85/0.08)] p-2.5">
            <Shield className="h-4.5 w-4.5 text-[oklch(0.82_0.05_85)]" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Audit snapshot
              </p>
              <Badge variant="secondary">
                {categoryFilter === "all"
                  ? "All actions"
                  : categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Review Apex team actions across billing, access, pricing, and chat
              with searchable history.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/55 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Total entries
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Loaded from recent Apex activity
            </p>
          </div>
          <div className="rounded-xl border border-sky-500/14 bg-sky-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-100/80">
              Clinic linked
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.withTenant}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Actions tied to a clinic TIN
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/14 bg-amber-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-800">
              With detail
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {snapshot.withDetail}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Notes captured with the action
            </p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No audit entries</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {categoryFilter === "all"
              ? "Actions taken by the Apex team will appear here."
              : "No entries match this filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background/40">
          <ApexDataTable
            data={filtered}
            columns={columns}
            noun="entries"
            pageSize={10}
            showToolbar
            searchPlaceholder="Search action, TIN, member, detail…"
            rowClassName="hover:bg-muted/40"
          />
        </div>
      )}
    </div>
  );
}
