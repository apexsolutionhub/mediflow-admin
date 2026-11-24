export function apexPageTitle(pathname: string, searchParams?: URLSearchParams): string {
  if (pathname.startsWith("/feedback/")) return "Chat thread";
  if (pathname.startsWith("/tenants/") && pathname !== "/tenants") return "Tenant detail";
  if (pathname === "/tenants" && searchParams?.get("filter") === "inactive") {
    return "Inactive tenants";
  }

  const map: Record<string, string> = {
    "/dashboard": "Overview",
    "/reports": "Analytics",
    "/tenants": "All tenants",
    "/users": "Tenant users",
    "/pricing": "Pricing catalog",
    "/sales-agents": "Sales Agents",
    "/audit": "Audit log",
    "/payments/setup": "Setup payments",
    "/payments/quarterly": "Quarterly payments",
    "/ops-mode-requests": "Ops mode requests",
    "/signups": "New signups",
    "/feedback": "Clinic chat",
  };
  return map[pathname] || "MediFlow Console";
}
