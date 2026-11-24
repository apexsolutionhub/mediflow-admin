"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, startOfDay } from "date-fns";
import {
  CalendarDays,
  CalendarIcon,
  CircleDollarSign,
  NotebookPen,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  ApexTenantMetricTile,
  ApexTenantTabShell,
} from "@/components/apex/tenant/ApexTenantTabShell";
import {
  ApexTenantBranchScope,
  buildBranchScopeOptions,
} from "@/components/apex/tenant/ApexTenantBranchScope";
import {
  getErrorMessage,
  type TenantBranch,
  updateTenant,
} from "@/lib/api";
import type { Tenant } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatEtb(n: number) {
  return `${n.toLocaleString("en-US")} ETB`;
}

function parseTrialDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isValid(d) ? startOfDay(d) : undefined;
}

function toDateKey(d: Date | undefined): string {
  return d && isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

type BillingValues = {
  setup_fee_etb: number;
  quarterly_fee_etb: number;
  billing_notes: string | null;
  is_illustration: boolean;
  billing_hold: boolean;
  free_trial_ends_at: string | null;
};

type Props = {
  orgTin: string;
  tenant: Tenant;
  branches: TenantBranch[];
  scopeKey: string;
  onScopeChange: (key: string) => void;
  loadingScope?: boolean;
  busy: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSaved?: () => void;
};

export function ApexTenantBillingSettings({
  orgTin,
  tenant,
  branches,
  scopeKey,
  onScopeChange,
  loadingScope,
  busy,
  onBusyChange,
  onSaved,
}: Props) {
  const [setupFee, setSetupFee] = useState(String(tenant.setup_fee_etb ?? 0));
  const [quarterlyFee, setQuarterlyFee] = useState(String(tenant.quarterly_fee_etb ?? 0));
  const [notes, setNotes] = useState(tenant.billing_notes ?? "");
  const [illustration, setIllustration] = useState(Boolean(tenant.is_illustration));
  const [hold, setHold] = useState(Boolean(tenant.billing_hold));
  const [trialEnd, setTrialEnd] = useState<Date | undefined>(() =>
    parseTrialDate(tenant.free_trial_ends_at),
  );
  const [trialOpen, setTrialOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(tenant);

  const setupNum = Number(setupFee) || 0;
  const quarterlyNum = Number(quarterlyFee) || 0;
  const combinedBusy = busy || saving || Boolean(loadingScope);

  const scopeOptions = useMemo(
    () => buildBranchScopeOptions(orgTin, branches, { includeOrgDefault: true }),
    [orgTin, branches],
  );

  const selectedLabel = useMemo(() => {
    const opt = scopeOptions.find((o) => o.key === scopeKey);
    return opt?.label ?? "Branch";
  }, [scopeOptions, scopeKey]);

  const targetTin = useMemo(() => {
    const opt = scopeOptions.find((o) => o.key === scopeKey);
    return opt?.tin ?? orgTin;
  }, [scopeOptions, scopeKey, orgTin]);

  useEffect(() => {
    setBaseline(tenant);
    setSetupFee(String(tenant.setup_fee_etb ?? 0));
    setQuarterlyFee(String(tenant.quarterly_fee_etb ?? 0));
    setNotes(tenant.billing_notes ?? "");
    setIllustration(Boolean(tenant.is_illustration));
    setHold(Boolean(tenant.billing_hold));
    setTrialEnd(parseTrialDate(tenant.free_trial_ends_at));
  }, [tenant]);

  const dirty = useMemo(() => {
    return (
      setupNum !== (baseline.setup_fee_etb ?? 0) ||
      quarterlyNum !== (baseline.quarterly_fee_etb ?? 0) ||
      notes.trim() !== (baseline.billing_notes ?? "").trim() ||
      illustration !== Boolean(baseline.is_illustration) ||
      hold !== Boolean(baseline.billing_hold) ||
      toDateKey(trialEnd) !== toDateKey(parseTrialDate(baseline.free_trial_ends_at))
    );
  }, [setupNum, quarterlyNum, notes, illustration, hold, trialEnd, baseline]);

  const currentValues = (): BillingValues => ({
    setup_fee_etb: setupNum,
    quarterly_fee_etb: quarterlyNum,
    billing_notes: notes.trim() || null,
    is_illustration: illustration,
    billing_hold: hold,
    free_trial_ends_at: trialEnd ? startOfDay(trialEnd).toISOString() : null,
  });

  const saveTarget = useCallback(async (tin: string, values: BillingValues) => {
    await updateTenant(tin, {
      setup_fee_etb: values.setup_fee_etb,
      quarterly_fee_etb: values.quarterly_fee_etb,
      billing_notes: values.billing_notes ?? "",
      is_illustration: values.is_illustration,
      billing_hold: values.billing_hold,
      free_trial_ends_at: values.free_trial_ends_at,
    });
  }, []);

  const onSave = async () => {
    setSaving(true);
    onBusyChange?.(true);
    try {
      await saveTarget(targetTin, currentValues());
      toast.success(`Billing saved for ${selectedLabel}`);
      onSaved?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  };

  const onApplyToAll = async () => {
    setSaving(true);
    onBusyChange?.(true);
    try {
      const values = currentValues();
      const tins = new Set<string>([orgTin]);
      for (const option of scopeOptions) tins.add(option.tin);
      await Promise.all([...tins].map((tin) => saveTarget(tin, values)));
      toast.success(`Applied billing to ${tins.size} account${tins.size === 1 ? "" : "s"}`);
      onSaved?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  };

  return (
    <ApexTenantTabShell
      title="Billing & fees"
      description="New branches inherit org default fees. Customize a branch here, or apply the current fees to all."
      icon={Settings2}
      tone="violet"
    >
      <div className="space-y-5">
        <ApexTenantBranchScope
          options={scopeOptions}
          value={scopeKey}
          onChange={onScopeChange}
          disabled={combinedBusy}
          hint="Fees start the same for every branch — override only when needed."
          onApplyAll={() => void onApplyToAll()}
          applyAllDisabled={combinedBusy || branches.length === 0}
        />

        {loadingScope ? (
          <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Loading branch billing…
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ApexTenantMetricTile
                label="Current setup"
                value={formatEtb(baseline.setup_fee_etb ?? 0)}
                sub={baseline.setup_fee_approved ? "Approved" : "Pending"}
              />
              <ApexTenantMetricTile
                label="Current quarterly"
                value={formatEtb(baseline.quarterly_fee_etb ?? 0)}
                sub={`${baseline.paid_quarters_count ?? 0} quarters paid`}
              />
            </div>

            <section className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-[oklch(0.78_0.06_85)]" />
                <h3 className="text-sm font-semibold">Fee amounts</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="setup-fee">Setup fee (ETB)</Label>
                  <Input
                    id="setup-fee"
                    type="number"
                    min={0}
                    step={1000}
                    value={setupFee}
                    onChange={(e) => setSetupFee(e.target.value)}
                    className="h-11 tabular-nums"
                    disabled={combinedBusy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quarterly-fee">Quarterly fee (ETB)</Label>
                  <Input
                    id="quarterly-fee"
                    type="number"
                    min={0}
                    step={1000}
                    value={quarterlyFee}
                    onChange={(e) => setQuarterlyFee(e.target.value)}
                    className="h-11 tabular-nums"
                    disabled={combinedBusy}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[oklch(0.72_0.08_195)]" />
                <h3 className="text-sm font-semibold">Free trial</h3>
              </div>
              <div className="space-y-2">
                <Label>Trial end date</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Popover open={trialOpen} onOpenChange={setTrialOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id="trial-end"
                        disabled={combinedBusy}
                        className={cn(
                          "h-11 min-w-[16rem] flex-1 justify-start gap-2 px-3 font-normal sm:max-w-sm",
                          !trialEnd && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0 text-[oklch(0.75_0.05_85)]" />
                        {trialEnd ? (
                          <span className="tabular-nums">{format(trialEnd, "PPP")}</span>
                        ) : (
                          <span>Select trial end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto border-border/70 p-0 shadow-xl"
                      align="start"
                      sideOffset={6}
                    >
                      <Calendar
                        mode="single"
                        selected={trialEnd}
                        captionLayout="dropdown"
                        buttonVariant="ghost"
                        defaultMonth={trialEnd ?? new Date()}
                        onSelect={(date) => {
                          setTrialEnd(date ? startOfDay(date) : undefined);
                          setTrialOpen(false);
                        }}
                        disabled={{ before: startOfDay(new Date()) }}
                      />
                      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => {
                            setTrialEnd(undefined);
                            setTrialOpen(false);
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs"
                          onClick={() => setTrialOpen(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {trialEnd ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-11 w-11 shrink-0"
                      aria-label="Clear trial end date"
                      disabled={combinedBusy}
                      onClick={() => setTrialEnd(undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-[oklch(0.72_0.08_300)]" />
                <h3 className="text-sm font-semibold">Notes & enforcement</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-notes">Apex billing notes</Label>
                <Textarea
                  id="billing-notes"
                  rows={4}
                  className="min-h-26 resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Discounts, legacy terms, follow-up notes…"
                  disabled={combinedBusy}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  htmlFor="illustration"
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-black/15 px-4 py-3.5 transition-colors hover:border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Illustration tenant</p>
                    <p className="text-xs text-muted-foreground">No billing enforcement</p>
                  </div>
                  <Switch
                    id="illustration"
                    checked={illustration}
                    onCheckedChange={setIllustration}
                    disabled={combinedBusy}
                  />
                </label>
                <label
                  htmlFor="billing-hold"
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-black/15 px-4 py-3.5 transition-colors hover:border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Billing hold</p>
                    <p className="text-xs text-muted-foreground">
                      Pause billing and block staff login for this branch
                    </p>
                  </div>
                  <Switch
                    id="billing-hold"
                    checked={hold}
                    onCheckedChange={setHold}
                    disabled={combinedBusy}
                  />
                </label>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                {dirty
                  ? `Unsaved changes for ${selectedLabel}.`
                  : `Billing settings saved for ${selectedLabel}.`}
              </p>
              <Button
                size="sm"
                variant="apex"
                className="min-w-40 cursor-pointer"
                disabled={combinedBusy || !dirty}
                onClick={() => void onSave()}
              >
                {saving ? "Saving…" : "Save billing settings"}
              </Button>
            </div>
          </>
        )}
      </div>
    </ApexTenantTabShell>
  );
}
