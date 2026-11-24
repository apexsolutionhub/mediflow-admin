"use client";

import { Building2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenantBranch } from "@/lib/api";
import { cn } from "@/lib/utils";

export function operationalBranchTin(branch: TenantBranch, orgTin: string) {
  return (branch.branch_tin || orgTin).trim() || orgTin;
}

export type BranchScopeOption = {
  key: string;
  label: string;
  tin: string;
  badge?: string;
  isMain?: boolean;
};

export function buildBranchScopeOptions(
  orgTin: string,
  branches: TenantBranch[],
  opts?: { includeOrgDefault?: boolean },
): BranchScopeOption[] {
  const includeOrgDefault = Boolean(opts?.includeOrgDefault);
  const options: BranchScopeOption[] = [];

  if (includeOrgDefault) {
    options.push({
      key: "__org__",
      label: "Org default",
      tin: orgTin,
      badge: "Template",
    });
  }

  const sorted = [...branches].sort((a, b) => {
    if (Boolean(a.is_main) !== Boolean(b.is_main)) return a.is_main ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const branch of sorted) {
    options.push({
      key: String(branch.id),
      label: branch.name,
      tin: operationalBranchTin(branch, orgTin),
      badge: branch.is_main ? "Main" : undefined,
      isMain: Boolean(branch.is_main),
    });
  }

  if (options.length === 0) {
    options.push({
      key: "__org__",
      label: "Organization",
      tin: orgTin,
      badge: "Main",
      isMain: true,
    });
  }

  return options;
}

type Props = {
  options: BranchScopeOption[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  hint?: string;
  onApplyAll?: () => void;
  applyAllLabel?: string;
  applyAllDisabled?: boolean;
  className?: string;
};

export function ApexTenantBranchScope({
  options,
  value,
  onChange,
  disabled,
  hint,
  onApplyAll,
  applyAllLabel = "Apply to all branches",
  applyAllDisabled,
  className,
}: Props) {
  if (options.length <= 1 && !onApplyAll) {
    return null;
  }

  const selected = options.find((o) => o.key === value) ?? options[0];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-linear-to-br from-muted/50 via-muted/30 to-background/40 p-3.5 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.28_0.05_195)] text-[oklch(0.9_0.04_195)] ring-1 ring-[oklch(0.62_0.12_195/0.35)]">
            <Building2 className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Branch scope</p>
            <p className="text-[11px] text-muted-foreground">
              {hint ||
                (selected
                  ? `Working on ${selected.label} · TIN ${selected.tin}`
                  : "Choose a branch")}
            </p>
          </div>
        </div>
        {onApplyAll ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-xl"
            disabled={disabled || applyAllDisabled}
            onClick={onApplyAll}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {applyAllLabel}
          </Button>
        ) : null}
      </div>

      {options.length > 1 ? (
        <div className="mt-3 -mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {options.map((option) => {
            const active = option.key === value;
            return (
              <button
                key={option.key}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option.key)}
                className={cn(
                  "group relative shrink-0 rounded-xl border px-3.5 py-2 text-left transition-all",
                  active
                    ? "border-[oklch(0.62_0.12_195/0.45)] bg-card shadow-sm ring-1 ring-[oklch(0.62_0.12_195/0.25)]"
                    : "border-transparent bg-background/40 hover:border-border hover:bg-card/70",
                  disabled && "pointer-events-none opacity-60",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium tracking-tight",
                      active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </span>
                  {option.badge ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        active
                          ? "bg-[oklch(0.62_0.12_195/0.15)] text-[oklch(0.78_0.06_195)]"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {option.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{option.tin}</p>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
