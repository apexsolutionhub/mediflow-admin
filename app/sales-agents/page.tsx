"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexPageHeader } from "@/components/apex/PageChrome";
import { ApexSalesAgentsTable } from "@/components/apex/sales/ApexSalesAgentsTable";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchApexSalesAgents,
  getErrorMessage,
  isUnauthenticatedError,
  type SalesAgentRow,
} from "@/lib/api";

export default function SalesAgentsPage() {
  const [agents, setAgents] = useState<SalesAgentRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      setAgents(await fetchApexSalesAgents(false));
    } catch (err) {
      if (isUnauthenticatedError(err)) return;
      const msg = getErrorMessage(err);
      setLoadError(msg);
      setAgents([]);
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <ConsoleShell>
      <div className="space-y-8">
        <ApexPageHeader
          title="Sales Agents"
          description="Register the people who sell MediFlow. They appear as an optional choice on clinic signup and create tenant."
          breadcrumbs={[{ label: "Sales Agents" }]}
        />
        {loadError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}
        {agents === null ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <ApexSalesAgentsTable agents={agents} onChanged={() => void reload()} />
        )}
      </div>
    </ConsoleShell>
  );
}
