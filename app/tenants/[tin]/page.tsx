"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ApexPageHeader } from "@/components/apex/PageChrome";
import { ApexTenantSummaryStrip } from "@/components/apex/tenant/ApexTenantSummaryStrip";
import {
  ApexTenantSectionNav,
  type TenantTabId,
} from "@/components/apex/tenant/ApexTenantSectionNav";
import { ApexTenantReporting } from "@/components/apex/tenant/ApexTenantReporting";
import { ApexTenantBillingActions } from "@/components/apex/tenant/ApexTenantBillingActions";
import { ApexTenantBillingSettings } from "@/components/apex/tenant/ApexTenantBillingSettings";
import { ApexTenantAccessControl } from "@/components/apex/tenant/ApexTenantAccessControl";
import { ApexTenantStaffTable } from "@/components/apex/tenant/ApexTenantStaffTable";
import { ApexTenantPaymentsTable } from "@/components/apex/tenant/ApexTenantPaymentsTable";
import { ApexTenantBranches } from "@/components/apex/tenant/ApexTenantBranches";
import {
  ApexTenantBranchScope,
  buildBranchScopeOptions,
} from "@/components/apex/tenant/ApexTenantBranchScope";
import {
  approveQuarterlyPayment,
  approveSetupPayment,
  changeTenantStatus,
  fetchTenantBranches,
  getErrorMessage,
  getTenant,
  isUnauthenticatedError,
  rejectPayment,
  releaseBillingHold,
  setUserLoginDisabled,
  type TenantBranch,
  updateTenant,
} from "@/lib/api";
import type { PaymentSubmission, Tenant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const TABS_WITH_BRANCH_SCOPE: TenantTabId[] = [
  "reports",
  "payments",
  "access",
  "billing",
  "staff",
];

export default function TenantDetailPage() {
  const params = useParams<{ tin: string }>();
  const tin = decodeURIComponent(params.tin);
  const [orgTenant, setOrgTenant] = useState<Tenant | null>(null);
  const [scopedTenant, setScopedTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [branches, setBranches] = useState<TenantBranch[]>([]);
  const [scopeKey, setScopeKey] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TenantTabId>("reports");
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingScope, setLoadingScope] = useState(false);

  const scopeOptions = useMemo(
    () =>
      buildBranchScopeOptions(tin, branches, {
        includeOrgDefault: tab === "billing",
      }),
    [tin, branches, tab],
  );

  const effectiveScopeKey = useMemo(() => {
    if (scopeOptions.some((o) => o.key === scopeKey)) return scopeKey;
    const main = scopeOptions.find((o) => o.isMain) ?? scopeOptions[0];
    return main?.key ?? "__org__";
  }, [scopeOptions, scopeKey]);

  const scopedTin = useMemo(() => {
    const opt = scopeOptions.find((o) => o.key === effectiveScopeKey);
    return opt?.tin ?? tin;
  }, [scopeOptions, effectiveScopeKey, tin]);

  const scopedLabel = useMemo(() => {
    const opt = scopeOptions.find((o) => o.key === effectiveScopeKey);
    return opt?.label ?? "Organization";
  }, [scopeOptions, effectiveScopeKey]);

  const reloadOrg = useCallback(async () => {
    const [data, branchPayload] = await Promise.all([
      getTenant(tin),
      fetchTenantBranches(tin).catch(() => ({ results: [] as TenantBranch[] })),
    ]);
    setOrgTenant(data);
    setBranches(branchPayload.results);
    return { data, branches: branchPayload.results };
  }, [tin]);

  const notifyBranchesChanged = useCallback(() => {
    void reloadOrg();
  }, [reloadOrg]);

  const loadScoped = useCallback(async (targetTin: string, fallback?: Tenant | null) => {
    const base = fallback ?? orgTenant;
    setLoadingScope(true);
    try {
      if (base && targetTin === base.pharmacy_tin) {
        setScopedTenant(base);
        setPayments(base.payments ?? []);
        return;
      }
      const data = await getTenant(targetTin);
      setScopedTenant(data);
      setPayments(data.payments ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Could not load branch");
      if (base) {
        setScopedTenant(base);
        setPayments(base.payments ?? []);
      }
    } finally {
      setLoadingScope(false);
    }
  }, [orgTenant]);

  useEffect(() => {
    void reloadOrg()
      .then(({ data }) => {
        // Seed scope from main after first load
        setScopedTenant(data);
        setPayments(data.payments ?? []);
      })
      .catch((err) => {
        if (!isUnauthenticatedError(err)) toast.error(getErrorMessage(err));
      })
      .finally(() => setInitialLoad(false));
  }, [reloadOrg]);

  useEffect(() => {
    if (!orgTenant) return;
    void loadScoped(scopedTin, orgTenant);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when scope TIN changes
  }, [scopedTin, orgTenant?.pharmacy_tin, orgTenant?.updated_at]);

  useEffect(() => {
    // When switching away from billing, drop "__org__" onto main branch.
    if (tab !== "billing" && scopeKey === "__org__") {
      const main = branches.find((b) => b.is_main);
      if (main) setScopeKey(String(main.id));
      else if (branches[0]) setScopeKey(String(branches[0].id));
    }
  }, [tab, scopeKey, branches]);

  const reload = useCallback(async () => {
    const { data } = await reloadOrg();
    await loadScoped(scopedTin, data);
  }, [reloadOrg, loadScoped, scopedTin]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      toast.success("Updated");
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (initialLoad && !orgTenant) {
    return (
      <ConsoleShell>
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
          <Spinner /> Loading tenant…
        </div>
      </ConsoleShell>
    );
  }

  if (!orgTenant) {
    return (
      <ConsoleShell>
        <ApexPageHeader
          title="Tenant not found"
          description={`No clinic matched TIN ${tin}`}
          breadcrumbs={[
            { label: "Tenants", href: "/tenants" },
            { label: tin },
          ]}
        />
      </ConsoleShell>
    );
  }

  const activeTenant = scopedTenant ?? orgTenant;
  const pendingSetup = payments.find(
    (p) => p.payment_kind === "setup" && p.status === "pending",
  );
  const showBranchScope =
    TABS_WITH_BRANCH_SCOPE.includes(tab) && scopeOptions.length > 1;

  return (
    <ConsoleShell>
      <div className="space-y-6">
        <ApexPageHeader
          title={orgTenant.pharmacy_name || tin}
          description={
            branches.length > 1
              ? `TIN ${orgTenant.pharmacy_tin} · ${branches.length} branches`
              : `TIN ${orgTenant.pharmacy_tin}`
          }
          breadcrumbs={[
            { label: "Tenants", href: "/tenants" },
            { label: orgTenant.pharmacy_name || tin },
          ]}
          actions={
            orgTenant.account_status === "active" ? (
              <Button asChild size="sm" variant="apex">
                <Link href={`/feedback?tin=${encodeURIComponent(tin)}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Open chat
                </Link>
              </Button>
            ) : undefined
          }
        />

        <ApexTenantSummaryStrip tenant={orgTenant} />
        <ApexTenantSectionNav value={tab} onValueChange={setTab} />

        {showBranchScope && tab !== "billing" ? (
          <ApexTenantBranchScope
            options={scopeOptions}
            value={effectiveScopeKey}
            onChange={setScopeKey}
            disabled={busy || loadingScope}
            hint={`Actions on this tab apply to ${scopedLabel} only.`}
          />
        ) : null}

        <div key={`${tab}-${effectiveScopeKey}`} className="apex-tenant-tab-panel min-w-0 space-y-6">
          {loadingScope && tab !== "billing" && tab !== "branches" ? (
            <div className="flex min-h-[24vh] items-center justify-center gap-2 text-muted-foreground">
              <Spinner /> Loading {scopedLabel}…
            </div>
          ) : null}

          {!loadingScope || tab === "billing" || tab === "branches" ? (
            <>
              {tab === "reports" ? (
                <ApexTenantReporting tenant={activeTenant} payments={payments} />
              ) : null}

              {tab === "payments" ? (
                <div className="space-y-6">
                  <ApexTenantBillingActions
                    tenant={activeTenant}
                    payments={payments}
                    busy={busy}
                    onApproveSetup={() =>
                      run(() => approveSetupPayment(scopedTin).then(() => undefined))
                    }
                    onRejectSetup={(rejectReason) =>
                      run(async () => {
                        if (!pendingSetup) return;
                        await rejectPayment(pendingSetup.id, rejectReason);
                      })
                    }
                    onApproveQuarterly={() =>
                      run(() => approveQuarterlyPayment(scopedTin).then(() => undefined))
                    }
                    onReleaseHold={() =>
                      run(() => releaseBillingHold(scopedTin).then(() => undefined))
                    }
                    onSetBillingHold={() =>
                      run(() =>
                        updateTenant(scopedTin, { billing_hold: true }).then(() => undefined),
                      )
                    }
                  />
                  <ApexTenantPaymentsTable
                    tin={scopedTin}
                    payments={payments}
                    busy={busy}
                    onChanged={() => void reload()}
                  />
                </div>
              ) : null}

              {tab === "access" ? (
                <ApexTenantAccessControl
                  tenant={activeTenant}
                  branchLabel={scopedLabel}
                  reason={reason}
                  busy={busy}
                  onReasonChange={setReason}
                  onSuspend={() =>
                    run(() =>
                      changeTenantStatus(scopedTin, "suspend", reason).then(() => undefined),
                    )
                  }
                  onBan={() =>
                    run(() => changeTenantStatus(scopedTin, "ban", reason).then(() => undefined))
                  }
                  onUnsuspend={() =>
                    run(() => changeTenantStatus(scopedTin, "unsuspend").then(() => undefined))
                  }
                  onUnban={() =>
                    run(() => changeTenantStatus(scopedTin, "unban").then(() => undefined))
                  }
                  onDelete={() =>
                    run(() =>
                      changeTenantStatus(scopedTin, "delete", reason).then(() => undefined),
                    )
                  }
                  onRestore={() =>
                    run(() =>
                      changeTenantStatus(scopedTin, "restore", reason || undefined).then(
                        () => undefined,
                      ),
                    )
                  }
                />
              ) : null}

              {tab === "billing" ? (
                <ApexTenantBillingSettings
                  orgTin={tin}
                  tenant={activeTenant}
                  branches={branches}
                  scopeKey={effectiveScopeKey}
                  onScopeChange={setScopeKey}
                  loadingScope={loadingScope}
                  busy={busy}
                  onBusyChange={setBusy}
                  onSaved={() => void reload()}
                />
              ) : null}

              {tab === "branches" ? (
                <ApexTenantBranches tin={tin} onChanged={notifyBranchesChanged} />
              ) : null}

              {tab === "staff" ? (
                <ApexTenantStaffTable
                  staff={activeTenant.staff ?? []}
                  branchLabel={scopedLabel}
                  busy={busy}
                  onToggleLogin={(userId, wasDisabled) =>
                    run(() => setUserLoginDisabled(userId, !wasDisabled).then(() => undefined))
                  }
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </ConsoleShell>
  );
}
