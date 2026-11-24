import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Tags,
  UserPlus,
  Users,
  Handshake,
  Server,
} from "lucide-react";

export type ApexNavBadgeKey =
  | "pending_setup_payments"
  | "pending_quarterly_payments"
  | "setup_pending_tenants"
  | "inactive_tenants"
  | "unread_feedback"
  | "disabled_users"
  | "pending_ops_mode_requests";

export type ApexNavItem = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
  badgeKey?: ApexNavBadgeKey;
};

export const APEX_MAIN_NAV: ApexNavItem[] = [
  { id: "overview", href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    id: "reports",
    href: "/reports",
    label: "Analytics",
    icon: BarChart3,
    matchPrefix: true,
  },
  {
    id: "tenants",
    href: "/tenants",
    label: "All tenants",
    icon: Building2,
    matchPrefix: true,
  },
  {
    id: "users",
    href: "/users",
    label: "Tenant users",
    icon: Users,
    matchPrefix: true,
    badgeKey: "disabled_users",
  },
];

export const APEX_MONITORING_NAV: ApexNavItem[] = [
  { id: "pricing", href: "/pricing", label: "Pricing catalog", icon: Tags },
  {
    id: "sales-agents",
    href: "/sales-agents",
    label: "Sales Agents",
    icon: Handshake,
  },
  {
    id: "audit",
    href: "/audit",
    label: "Audit log",
    icon: FileText,
    matchPrefix: true,
  },
];

export const APEX_ACTION_NAV: ApexNavItem[] = [
  {
    id: "setup-payments",
    href: "/payments/setup",
    label: "Setup payments",
    icon: ClipboardList,
    badgeKey: "pending_setup_payments",
  },
  {
    id: "quarterly-payments",
    href: "/payments/quarterly",
    label: "Quarterly payments",
    icon: CreditCard,
    badgeKey: "pending_quarterly_payments",
  },
  {
    id: "ops-mode-requests",
    href: "/ops-mode-requests",
    label: "Ops mode requests",
    icon: Server,
    badgeKey: "pending_ops_mode_requests",
  },
  {
    id: "signups",
    href: "/signups",
    label: "New signups",
    icon: UserPlus,
    badgeKey: "setup_pending_tenants",
  },
  {
    id: "inactive-tenants",
    href: "/tenants?filter=inactive",
    label: "Inactive tenants",
    icon: Users,
    badgeKey: "inactive_tenants",
  },
  {
    id: "feedback",
    href: "/feedback",
    label: "Clinic chat",
    icon: MessageCircle,
    matchPrefix: true,
    badgeKey: "unread_feedback",
  },
];
