"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexPageHeader } from "@/components/apex/PageChrome";
import { ApexPricingRulesTable } from "@/components/apex/pricing/ApexPricingRulesTable";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage, isUnauthenticatedError, listPricingRules } from "@/lib/api";
import type { PricingRule } from "@/lib/types";

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      setRules(await listPricingRules());
    } catch (err) {
      if (isUnauthenticatedError(err)) return;
      const msg = getErrorMessage(err);
      setLoadError(msg);
      setRules([]);
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
          title="Pricing catalog"
          description="Setup and quarterly fees for the MediFlow clinic plan. Individual tenants can still override fees."
          breadcrumbs={[{ label: "Pricing catalog" }]}
        />

        {loadError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}

        {rules === null ? (
          <div className="flex min-h-[30vh] items-center justify-center gap-2 text-muted-foreground">
            <Spinner /> Loading pricing catalog…
          </div>
        ) : (
          <ApexPricingRulesTable rules={rules} onChanged={() => void reload()} />
        )}
      </div>
    </ConsoleShell>
  );
}
