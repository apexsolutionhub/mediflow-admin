"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexCreateTenantDialog } from "@/components/apex/onboarding/ApexCreateTenantDialog";
import { ApexSignupsTable } from "@/components/apex/signups/ApexSignupsTable";
import { ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage, isUnauthenticatedError, listSignups } from "@/lib/api";
import type { SignupRow } from "@/lib/types";

const WHATSAPP = ["+251935000642", "+251930272975"];

export default function SignupsPage() {
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listSignups());
    } catch (err) {
      if (!isUnauthenticatedError(err)) {
        toast.error(getErrorMessage(err) || "Failed to load signups");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ConsoleShell>
      <div className="space-y-8">
        <ApexPageHeader
          title="New signups"
          description="Clinics that signed up this month — filter by pending, approved, or rejected setup."
          actions={
            <ApexCreateTenantDialog size="sm" variant="apex" onCreated={() => void load()}>
              Create tenant manually
            </ApexCreateTenantDialog>
          }
        />

        <div className="flex items-start gap-3 rounded-xl border border-[oklch(0.62_0.1_195/0.22)] bg-[oklch(0.62_0.1_195/0.08)] px-4 py-3 text-sm text-foreground/90">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.78_0.08_195)]" />
          <p>
            Escalation WhatsApp: {WHATSAPP.join(" · ")} · CBE account{" "}
            <span className="font-mono">1000418779358</span>
          </p>
        </div>

        <Panel className="overflow-hidden p-0">
          {loading ? (
            <div className="flex min-h-[20vh] items-center justify-center gap-2 text-muted-foreground">
              <Spinner /> Loading signups…
            </div>
          ) : (
            <ApexSignupsTable rows={rows} onChanged={() => void load()} />
          )}
        </Panel>
      </div>
    </ConsoleShell>
  );
}
