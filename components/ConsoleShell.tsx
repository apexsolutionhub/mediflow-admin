"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Loader2, LogOut, RefreshCw, Search } from "lucide-react";
import {
  APEX_ACTION_NAV,
  APEX_MAIN_NAV,
  APEX_MONITORING_NAV,
  type ApexNavItem,
} from "@/constants/apexNav";
import { APEX } from "@/constants/branding";
import { clearSession, getApexMe, getDashboardSummary, getStoredToken, persistSession } from "@/lib/api";
import { apexPageTitle } from "@/lib/pageTitles";
import type { ApexUser, DashboardSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ApexCommandPalette } from "@/components/apex/CommandPalette";
import { ApexLogo, ApexLogoMark } from "@/components/apex/ApexLogo";

function isNavActive(item: ApexNavItem, pathname: string, searchParams: URLSearchParams) {
  const [path, queryString] = item.href.split("?");
  const pathMatch =
    pathname === path || (item.matchPrefix && pathname.startsWith(`${path}/`));
  if (!pathMatch && pathname !== path) return false;
  if (queryString) {
    const expected = new URLSearchParams(queryString);
    for (const [key, value] of expected.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return pathname === path;
  }
  if (pathname === "/tenants" && !item.href.includes("?")) {
    return searchParams.get("filter") !== "inactive" && pathMatch;
  }
  return pathname === path || Boolean(item.matchPrefix && pathname.startsWith(`${path}/`));
}

function badgeForItem(item: ApexNavItem, summary: DashboardSummary | null) {
  if (!item.badgeKey || !summary) return undefined;
  const n = summary[item.badgeKey];
  return typeof n === "number" && n > 0 ? n : undefined;
}

function ApexNavGroup({
  label,
  items,
  pathname,
  searchParams,
  summary,
}: {
  label: string;
  items: ApexNavItem[];
  pathname: string;
  searchParams: URLSearchParams;
  summary: DashboardSummary | null;
}) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup className="min-w-0 px-2 py-0">
      <SidebarGroupLabel className="apex-sidebar-section mb-1 px-2">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item, pathname, searchParams);
          const badge = badgeForItem(item, summary);
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                type="button"
                isActive={active}
                tooltip={item.label}
                className={cn(
                  "apex-nav-item h-10 cursor-pointer rounded-lg px-2.5 transition-colors",
                  active && "apex-nav-active",
                )}
                onClick={() => {
                  router.push(item.href);
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </SidebarMenuButton>
              {badge != null ? (
                <SidebarMenuBadge className="apex-nav-badge right-2 top-1/2 -translate-y-1/2">
                  {badge > 99 ? "99+" : badge}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground md:inline">
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function ConsoleShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<ApexUser | null>(null);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        const me = await getApexMe();
        persistSession(token, me);
        setUser(me);
        setReady(true);
        await refresh();
      } catch {
        clearSession();
        router.replace("/login");
      }
    })();
  }, [router, refresh]);

  const pageTitle = apexPageTitle(pathname, searchParams);
  const queueTotal = summary
    ? summary.pending_setup_payments +
      summary.pending_quarterly_payments +
      (summary.unread_feedback || 0) +
      (summary.pending_ops_mode_requests || 0)
    : 0;

  if (!ready) {
    return (
      <div className="apex-canvas flex min-h-svh flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm">Preparing your workspace…</p>
      </div>
    );
  }

  return (
    <SidebarProvider className="min-h-svh bg-muted/40">
      <ApexCommandPalette />
      <div className="flex min-h-svh w-full">
        <Sidebar collapsible="icon" className="apex-sidebar border-r-0">
          <SidebarHeader className="apex-sidebar-header border-b border-white/6 px-4 py-5">
            <div className="flex items-center gap-3">
              <ApexLogo size={44} className="shrink-0" priority />
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold tracking-tight text-white">
                  Apex - MediFlow
                </p>
                <p className="truncate text-xs text-white/45">{APEX.tagline}</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="apex-sidebar-scroll min-w-0 gap-1 py-4 pr-1">
            <ApexNavGroup
              label="Workspace"
              items={APEX_MAIN_NAV}
              pathname={pathname}
              searchParams={searchParams}
              summary={summary}
            />
            <SidebarSeparator className="my-3 bg-white/6" />
            <ApexNavGroup
              label="Monitoring"
              items={APEX_MONITORING_NAV}
              pathname={pathname}
              searchParams={searchParams}
              summary={summary}
            />
            <SidebarSeparator className="my-3 bg-white/6" />
            <ApexNavGroup
              label="Action queues"
              items={APEX_ACTION_NAV}
              pathname={pathname}
              searchParams={searchParams}
              summary={summary}
            />

            {summary &&
            ((summary.suspended_tenants || 0) > 0 || (summary.banned_tenants || 0) > 0) ? (
              <div className="apex-alert-card mx-2 mt-4 group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Account alerts
                </p>
                {(summary.suspended_tenants || 0) > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {summary.suspended_tenants} suspended
                  </p>
                ) : null}
                {(summary.banned_tenants || 0) > 0 ? (
                  <p className="text-xs text-muted-foreground">{summary.banned_tenants} banned</p>
                ) : null}
              </div>
            ) : null}
          </SidebarContent>

          <SidebarFooter className="apex-sidebar-footer shrink-0 border-t border-white/6 p-4">
            <div className="apex-user-card mb-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-3">
                <ApexLogoMark size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.full_name?.trim() || user?.username || "Apex Admin"}
                  </p>
                  <p className="truncate text-xs text-white/45">Apex team</p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="apex-sidebar-signout h-11 w-full rounded-lg shadow-none"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="apex-canvas apex-floating-inset flex min-h-svh flex-col overflow-x-hidden">
          <header className="apex-topbar sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 px-4 md:h-16 md:px-6">
            <SidebarTrigger className="apex-icon-btn h-9 w-9 shrink-0" />
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-sm font-semibold tracking-tight">{pageTitle}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {queueTotal > 0
                  ? `${queueTotal} item${queueTotal === 1 ? "" : "s"} in your queues`
                  : `Signed in as ${user?.username}`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("apex:open-command"))}
                className="apex-icon-btn hidden h-9 items-center gap-2 px-3 text-xs text-muted-foreground sm:flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Search</span>
                <kbd className="rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
              {queueTotal > 0 ? (
                <span className="hidden rounded-full border border-primary/35 bg-primary/12 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-primary sm:inline">
                  {queueTotal} pending
                </span>
              ) : null}
              <LiveClock />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="apex-icon-btn h-9 w-9"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await refresh();
                    window.dispatchEvent(new Event("apex:refresh"));
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </header>
          <main className="apex-page flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="apex-canvas flex min-h-svh flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm">Preparing your workspace…</p>
        </div>
      }
    >
      <ConsoleShellInner>{children}</ConsoleShellInner>
    </Suspense>
  );
}
