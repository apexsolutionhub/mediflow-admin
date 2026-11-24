"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Handshake,
  LayoutDashboard,
  MessageCircle,
  Server,
  Tags,
  UserPlus,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/reports", label: "Analytics", icon: BarChart3 },
  { href: "/tenants", label: "All tenants", icon: Building2 },
  { href: "/users", label: "Tenant users", icon: Users },
  { href: "/pricing", label: "Pricing catalog", icon: Tags },
  { href: "/sales-agents", label: "Sales Agents", icon: Handshake },
  { href: "/audit", label: "Audit log", icon: FileText },
  { href: "/payments/setup", label: "Setup payments", icon: ClipboardList },
  { href: "/payments/quarterly", label: "Quarterly payments", icon: CreditCard },
  { href: "/ops-mode-requests", label: "Ops mode requests", icon: Server },
  { href: "/signups", label: "New signups", icon: UserPlus },
  { href: "/feedback", label: "Clinic chat", icon: MessageCircle },
];

export function ApexCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("apex:open-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("apex:open-command", onOpen);
    };
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a page…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
