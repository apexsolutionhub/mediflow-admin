"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Users } from "lucide-react";
import type { TenantUserRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type TenantUsersBranchGroup = {
  name: string;
  tin: string;
  isMain: boolean;
  roles: string[];
  userCount: number;
  disabledCount: number;
  users: TenantUserRow[];
};

export type TenantUsersGroup = {
  pharmacy_tin: string;
  pharmacy_name: string;
  roleCount: number;
  roles: string[];
  userCount: number;
  disabledCount: number;
  pays: boolean;
  standingLabel: string;
  subscriptionStatus: string | null;
  accountStatus: string | null;
  is_illustration: boolean;
  users: TenantUserRow[];
  branches: TenantUsersBranchGroup[];
};

/** Third meta segment: Banned / Suspended / Pays / Doesn't pay */
export function tenantStandingLabel(input: {
  accountStatus?: string | null;
  subscriptionStatus?: string | null;
  isIllustration?: boolean;
}): string {
  const account = String(input.accountStatus || "").trim().toLowerCase();
  if (account === "banned") return "Banned";
  if (account === "suspended") return "Suspended";

  const subscription = String(input.subscriptionStatus || "").trim().toLowerCase();
  if (input.isIllustration || subscription === "exempt") {
    return "Doesn't pay";
  }

  if (
    subscription === "active" ||
    subscription === "warning" ||
    subscription === "trial"
  ) {
    return "Pays";
  }

  return "Doesn't pay";
}

export function tenantUsersMetaLine(group: TenantUsersGroup) {
  const branchBit =
    group.branches.length > 1
      ? ` · ${group.branches.length} branches`
      : "";
  return `Clinic · ${group.roleCount} ${
    group.roleCount === 1 ? "role" : "roles"
  }${branchBit} · ${group.standingLabel}`;
}

function usersGroupedByRole(users: TenantUserRow[]) {
  const map = new Map<string, TenantUserRow[]>();
  for (const user of users) {
    const key = String(user.role || "").trim() || "Unassigned";
    const list = map.get(key);
    if (list) list.push(user);
    else map.set(key, [user]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function UserDetailCard({ user }: { user: TenantUserRow }) {
  return (
    <div className="w-full min-w-0 rounded-lg border border-border/60 bg-card/80 px-3 py-2.5">
      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium wrap-break-word">{user.username}</p>
          <p className="text-xs text-muted-foreground wrap-break-word">
            Role:{" "}
            <span className="capitalize text-foreground/90">
              {user.role || "—"}
            </span>
          </p>
        </div>
        {user.login_disabled ? (
          <Badge variant="destructive" className="w-fit shrink-0 text-[10px] font-normal">
            Disabled
          </Badge>
        ) : (
          <Badge variant="success" className="w-fit shrink-0 text-[10px] font-normal">
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}

function TenantIdentity({ group }: { group: TenantUsersGroup }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold wrap-break-word">
        {group.pharmacy_name || group.pharmacy_tin}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground wrap-break-word">
        {tenantUsersMetaLine(group)}
      </p>
    </div>
  );
}

function BranchChip({ branch }: { branch: TenantUsersBranchGroup }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            {branch.name}
            {branch.isMain ? (
              <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-[oklch(0.75_0.05_195)]">
                Main
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{branch.tin}</p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {branch.userCount}
        </span>
      </div>
      {branch.roles.length > 0 ? (
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
          {branch.roles.join(" · ")}
        </p>
      ) : (
        <p className="mt-1.5 text-[10px] text-muted-foreground">No staff yet</p>
      )}
    </div>
  );
}

function PreviewBody({ group }: { group: TenantUsersGroup }) {
  const multi = group.branches.length > 1;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <TenantIdentity group={group} />
        <p className="shrink-0 text-xs font-semibold tabular-nums">
          {group.userCount} user{group.userCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        <p className="break-all">
          <span className="text-foreground/80">Org TIN</span> {group.pharmacy_tin}
        </p>
        <p className="wrap-break-word">
          <span className="text-foreground/80">Standing</span> {group.standingLabel}
          {group.is_illustration ? " · illustration" : ""}
        </p>
        <p>
          <span className="text-foreground/80">Login</span>{" "}
          {group.disabledCount > 0
            ? `${group.disabledCount} disabled · ${group.userCount - group.disabledCount} active`
            : "All active"}
        </p>
      </div>

      {multi ? (
        <div className="space-y-2 border-t border-border/50 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/90">
            <Building2 className="h-3.5 w-3.5 opacity-70" />
            Branches
          </div>
          <div className="grid gap-1.5">
            {group.branches.map((branch) => (
              <BranchChip key={branch.tin} branch={branch} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 border-t border-border/50 pt-2">
          {group.users.map((user) => (
            <UserDetailCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}

function SheetBody({ group }: { group: TenantUsersGroup }) {
  const multi = group.branches.length > 1;
  return (
    <div className="w-full min-w-0 space-y-5 pb-2">
      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-4">
        <TenantIdentity group={group} />

        <dl className="grid w-full min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">Org TIN</dt>
            <dd className="font-mono text-xs font-medium break-all">
              {group.pharmacy_tin}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">Branches</dt>
            <dd className="font-medium tabular-nums">{group.branches.length || 1}</dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-[11px] text-muted-foreground">Standing</dt>
            <dd className="font-medium wrap-break-word">
              {group.standingLabel}
              {group.is_illustration ? " · illustration tenant" : ""}
              {group.subscriptionStatus
                ? ` · ${group.subscriptionStatus.replace(/_/g, " ")}`
                : ""}
              {group.accountStatus ? ` · account ${group.accountStatus}` : ""}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">Users</dt>
            <dd className="font-medium tabular-nums">{group.userCount}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">Login</dt>
            <dd className="font-medium wrap-break-word">
              {group.disabledCount > 0 ? (
                <span className="text-destructive">
                  {group.disabledCount} disabled
                </span>
              ) : (
                "All active"
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="w-full min-w-0 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 shrink-0 opacity-70" />
          {multi ? "Staff by branch" : "Staff accounts"}
        </div>

        {multi
          ? group.branches.map((branch) => {
              const byRole = usersGroupedByRole(branch.users);
              return (
                <section
                  key={branch.tin}
                  className="w-full min-w-0 space-y-3 rounded-xl border border-border/60 bg-card/40 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold wrap-break-word">
                        {branch.name}
                        {branch.isMain ? (
                          <Badge variant="secondary" className="ml-2 align-middle text-[10px]">
                            Main
                          </Badge>
                        ) : null}
                      </h3>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {branch.tin}
                      </p>
                      {branch.roles.length > 0 ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Roles: {branch.roles.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {branch.userCount} user{branch.userCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  {byRole.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No staff on this branch.</p>
                  ) : (
                    byRole.map(([role, users]) => (
                      <div key={`${branch.tin}-${role}`} className="space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {role}
                          </h4>
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {users.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {users.map((user) => (
                            <UserDetailCard key={user.id} user={user} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              );
            })
          : usersGroupedByRole(group.users).map(([role, users]) => (
              <section key={role} className="w-full min-w-0 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-semibold capitalize wrap-break-word">
                    {role}
                  </h3>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {users.length}
                  </span>
                </div>
                <div className="w-full min-w-0 space-y-1.5">
                  {users.map((user) => (
                    <UserDetailCard key={user.id} user={user} />
                  ))}
                </div>
              </section>
            ))}
      </div>

      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={`/tenants/${encodeURIComponent(group.pharmacy_tin)}`}>
          Open clinic page
        </Link>
      </Button>
    </div>
  );
}

export function ApexTenantUsersDetailTrigger({
  group,
  children,
  className,
}: {
  group: TenantUsersGroup;
  children: ReactNode;
  className?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const schedulePreviewOpen = () => {
    if (sheetOpen) return;
    clearTimers();
    openTimer.current = setTimeout(() => setPreviewOpen(true), 220);
  };

  const schedulePreviewClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setPreviewOpen(false), 160);
  };

  const openSheet = () => {
    clearTimers();
    setPreviewOpen(false);
    setSheetOpen(true);
  };

  const displayName = group.pharmacy_name || group.pharmacy_tin;

  return (
    <>
      <Popover
        open={previewOpen && !sheetOpen}
        onOpenChange={(next) => {
          if (!next) setPreviewOpen(false);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group/detail max-w-full rounded-md text-left outline-none transition-colors",
              "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40",
              "cursor-pointer",
              className,
            )}
            onMouseEnter={schedulePreviewOpen}
            onMouseLeave={schedulePreviewClose}
            onFocus={schedulePreviewOpen}
            onBlur={schedulePreviewClose}
            onClick={(e) => {
              e.stopPropagation();
              openSheet();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openSheet();
              }
            }}
            aria-label={`Details for ${displayName}`}
          >
            <span className="inline-flex max-w-full items-start gap-1">
              <span className="min-w-0 flex-1">{children}</span>
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/detail:opacity-70" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="flex max-h-[min(80vh,36rem)] w-[min(100vw-2rem,28rem)] flex-col overflow-hidden border-border/70 p-0 shadow-lg"
          onMouseEnter={schedulePreviewOpen}
          onMouseLeave={schedulePreviewClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <PreviewBody group={group} />
          </div>
          <div className="shrink-0 border-t border-border/60 bg-popover p-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full cursor-pointer"
              onClick={openSheet}
            >
              Open full detail
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="apex-sheet-scroll flex h-full w-[min(100%,36rem)] max-w-[min(100%,36rem)] flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-[min(100%,36rem)] data-[side=right]:max-w-[min(100%,36rem)] data-[side=right]:sm:max-w-136 sm:w-136 sm:max-w-136"
        >
          <SheetHeader className="shrink-0 space-y-1.5 border-b border-border/60 px-5 py-4 pr-14 text-left">
            <SheetTitle className="text-base leading-snug wrap-break-word">
              {displayName}
            </SheetTitle>
            <SheetDescription className="text-xs leading-snug wrap-break-word">
              {tenantUsersMetaLine(group)}
            </SheetDescription>
          </SheetHeader>
          <div className="apex-sheet-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4">
            <SheetBody group={group} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
