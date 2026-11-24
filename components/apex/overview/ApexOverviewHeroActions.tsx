import Link from "next/link";
import { BarChart3, Building2, MessageCircle } from "lucide-react";

export function ApexOverviewHeroActions() {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
      <Link href="/tenants" className="apex-overview-cta">
        <Building2 className="h-4 w-4 shrink-0 opacity-90" />
        All tenants
      </Link>
      <Link href="/reports" className="apex-overview-cta apex-overview-cta-primary">
        <BarChart3 className="h-4 w-4 shrink-0" />
        Analytics
      </Link>
      <Link href="/feedback" className="apex-overview-cta">
        <MessageCircle className="h-4 w-4 shrink-0 opacity-90" />
        Clinic chat
      </Link>
    </div>
  );
}
