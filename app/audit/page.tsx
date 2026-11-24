"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexAuditLogTable } from "@/components/apex/audit/ApexAuditLogTable";
import { ApexErrorAlert, ApexPageHeader, Panel } from "@/components/apex/PageChrome";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage, isUnauthenticatedError, listAuditLogs } from "@/lib/api";
import type { AuditLogRow } from "@/lib/types";

export default function AuditPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listAuditLogs();
        if (!cancelled) setRows(list);
      } catch (err) {
        if (isUnauthenticatedError(err)) return;
        const msg = getErrorMessage(err);
        if (!cancelled) {
          setError(msg);
          setRows([]);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ConsoleShell>
      <div className="space-y-8">
        <ApexPageHeader
          title="Audit log"
          description="Recent Apex operations on clinics, billing, and user access"
          breadcrumbs={[{ label: "Audit log" }]}
        />

        {error ? <ApexErrorAlert message={error} /> : null}

        <Panel className="space-y-0 border-0 bg-transparent p-0 shadow-none">
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center gap-2 text-muted-foreground">
              <Spinner /> Loading audit log…
            </div>
          ) : (
            <ApexAuditLogTable rows={rows} />
          )}
        </Panel>
      </div>
    </ConsoleShell>
  );
}
