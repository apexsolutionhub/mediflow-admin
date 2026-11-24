"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  ChevronRight,
  CircleDollarSign,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ApexDataTable } from "@/components/apex/ApexDataTable";
import { ApexEmptyState } from "@/components/apex/PageChrome";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  deletePricingRule,
  getErrorMessage,
  patchPricingRule,
  upsertPricingRule,
} from "@/lib/api";
import {
  DEFAULT_QUARTERLY_FEE_ETB,
  DEFAULT_SETUP_FEE_ETB,
} from "@/constants/modules";
import type { PricingRule } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  rules: PricingRule[];
  onChanged: () => void;
};

type EditorState = {
  id?: number;
  setup_fee_etb: string;
  quarterly_fee_etb: string;
  description: string;
};

function emptyEditor(): EditorState {
  return {
    setup_fee_etb: String(DEFAULT_SETUP_FEE_ETB),
    quarterly_fee_etb: String(DEFAULT_QUARTERLY_FEE_ETB),
    description: "Standard MediFlow clinic plan",
  };
}

import { PricingRuleStatusBadge } from "@/components/apex/StatusBadge";

function formatEtb(n: number) {
  return `${Number(n || 0).toLocaleString()} ETB`;
}

function PricingRulePreview({
  row,
  onOpenDetail,
}: {
  row: PricingRule;
  onOpenDetail: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Clinic plan</p>
        <p className="text-[11px] text-muted-foreground">
          Base package · {row.is_active ? "Active" : "Inactive"}
        </p>
      </div>

      {row.description ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {row.description}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Setup</dt>
          <dd className="mt-0.5 font-semibold text-foreground">
            {formatEtb(row.setup_fee_etb)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Quarterly</dt>
          <dd className="mt-0.5 font-semibold text-foreground">
            {formatEtb(row.quarterly_fee_etb)}
          </dd>
        </div>
      </dl>

      <Button variant="outline" size="sm" className="w-full" onClick={onOpenDetail}>
        Open detail
      </Button>
    </div>
  );
}

function PricingRuleSheetBody({
  row,
  onEdit,
}: {
  row: PricingRule;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-5 pb-2">
      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-4">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] text-muted-foreground">Plan</dt>
            <dd className="font-medium">Clinic</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Status</dt>
            <dd className="space-y-1.5">
              <PricingRuleStatusBadge isActive={row.is_active} />
              <p className="text-xs text-muted-foreground">
                {row.is_active
                  ? "Applied to new clinic onboarding by default."
                  : "Hidden from active pricing selection."}
              </p>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Setup fee</dt>
            <dd className="font-medium tabular-nums">
              {formatEtb(row.setup_fee_etb)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Quarterly fee</dt>
            <dd className="font-medium tabular-nums">
              {formatEtb(row.quarterly_fee_etb)}
            </dd>
          </div>
          {row.description ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] text-muted-foreground">Description</dt>
              <dd className="leading-relaxed">{row.description}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <Button variant="apex" className="w-full" onClick={onEdit}>
        Edit pricing rule
      </Button>
    </div>
  );
}

function PricingRuleDetailTrigger({
  row,
  children,
  className,
  onEdit,
}: {
  row: PricingRule;
  children: ReactNode;
  className?: string;
  onEdit: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const schedulePreviewOpen = () => {
    if (sheetOpen) return;
    clearTimers();
    openTimer.current = setTimeout(() => setPreviewOpen(true), 220);
  };

  const schedulePreviewClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setPreviewOpen(false), 160);
  };

  const openSheet = () => {
    clearTimers();
    setPreviewOpen(false);
    setSheetOpen(true);
  };

  return (
    <>
      <Popover
        open={previewOpen && !sheetOpen}
        onOpenChange={(next) => {
          if (!next) setPreviewOpen(false);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group/detail w-full rounded-md text-left outline-none transition-colors",
              "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40",
              "cursor-pointer",
              className,
            )}
            onMouseEnter={schedulePreviewOpen}
            onMouseLeave={schedulePreviewClose}
            onFocus={schedulePreviewOpen}
            onBlur={schedulePreviewClose}
            onClick={(e) => {
              e.stopPropagation();
              openSheet();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openSheet();
              }
            }}
            aria-label="Details for clinic pricing plan"
          >
            <span className="inline-flex w-full items-start gap-1">
              <span className="min-w-0 flex-1">{children}</span>
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/detail:opacity-70" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="flex w-80 flex-col overflow-hidden border-border/70 p-0 shadow-lg"
          onMouseEnter={schedulePreviewOpen}
          onMouseLeave={schedulePreviewClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-3">
            <PricingRulePreview row={row} onOpenDetail={openSheet} />
          </div>
        </PopoverContent>
      </Popover>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="apex-sheet-scroll flex h-full w-[min(100%,36rem)] max-w-[min(100%,36rem)] flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-[min(100%,36rem)] data-[side=right]:max-w-[min(100%,36rem)] data-[side=right]:sm:max-w-xl sm:w-xl sm:max-w-xl"
        >
          <SheetHeader className="shrink-0 space-y-1.5 border-b border-border/60 px-5 py-4 pr-14 text-left">
            <SheetTitle>Clinic plan</SheetTitle>
            <SheetDescription>
              Review this catalog rule, then open the editor to change fees.
            </SheetDescription>
          </SheetHeader>
          <div className="apex-sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <PricingRuleSheetBody
              row={row}
              onEdit={() => {
                setSheetOpen(false);
                onEdit();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ApexPricingRulesTable({ rules, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PricingRule | null>(null);
  const [toggleTarget, setToggleTarget] = useState<PricingRule | null>(null);
  const [editor, setEditor] = useState<EditorState>(() => emptyEditor());

  const activeRules = useMemo(() => rules.filter((r) => r.is_active), [rules]);
  const inactiveCount = rules.length - activeRules.length;
  const primary =
    activeRules[0] ??
    rules[0] ??
    null;

  const openCreate = () => {
    setEditor(emptyEditor());
    setOpen(true);
  };

  const openEdit = (row: PricingRule) => {
    setEditor({
      id: row.id,
      setup_fee_etb: String(row.setup_fee_etb),
      quarterly_fee_etb: String(row.quarterly_fee_etb),
      description: row.description ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await upsertPricingRule({
        business_type: "Clinic",
        modules: [],
        setup_fee_etb: Number(editor.setup_fee_etb) || 0,
        quarterly_fee_etb: Number(editor.quarterly_fee_etb) || 0,
        yearly_fee_etb: 0,
        description: editor.description.trim(),
        is_active: true,
      });
      toast.success(editor.id ? "Plan updated" : "Plan saved");
      setOpen(false);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    if (!toggleTarget) return;
    setBusy(true);
    try {
      await patchPricingRule(toggleTarget.id, { is_active: !toggleTarget.is_active });
      toast.success(toggleTarget.is_active ? "Plan disabled" : "Plan enabled");
      setToggleTarget(null);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeRule = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deletePricingRule(deleteTarget.id);
      toast.success("Plan deleted");
      setDeleteTarget(null);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<PricingRule>[]>(
    () => [
      {
        accessorKey: "business_type",
        header: "Plan",
        cell: ({ row }) => (
          <PricingRuleDetailTrigger
            row={row.original}
            className="-mx-1 px-1 py-0.5"
            onEdit={() => openEdit(row.original)}
          >
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium text-foreground transition-colors group-hover/detail:text-[oklch(0.82_0.04_85)] group-hover/price:text-[oklch(0.82_0.04_85)]">
                Clinic
              </p>
              <p className="text-xs text-muted-foreground wrap-break-word">
                {row.original.description || "Base package"}
              </p>
            </div>
          </PricingRuleDetailTrigger>
        ),
      },
      {
        accessorKey: "setup_fee_etb",
        header: () => <div className="text-right">Setup</div>,
        meta: { label: "Setup" },
        cell: ({ row }) => (
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatEtb(row.original.setup_fee_etb)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              One-time onboarding fee
            </p>
          </div>
        ),
      },
      {
        accessorKey: "quarterly_fee_etb",
        header: () => <div className="text-right">Quarterly</div>,
        meta: { label: "Quarterly" },
        cell: ({ row }) => (
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatEtb(row.original.quarterly_fee_etb)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Recurring every 3 months
            </p>
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <PricingRuleStatusBadge isActive={row.original.is_active} />
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer rounded-lg px-3 text-muted-foreground transition-colors group-hover/price:text-foreground"
              disabled={busy}
              onClick={() => openEdit(row.original)}
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer rounded-lg px-3"
              disabled={busy}
              onClick={() => setToggleTarget(row.original)}
            >
              {row.original.is_active ? "Disable" : "Enable"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer rounded-lg border-destructive/25 px-3 text-destructive transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-linear-to-r from-background/95 via-background/82 to-background/95 px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-[oklch(0.68_0.05_85/0.16)] bg-[oklch(0.68_0.05_85/0.08)] p-2.5">
              <Sparkles className="h-4.5 w-4.5 text-[oklch(0.82_0.05_85)]" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Pricing snapshot
                </p>
                <Badge variant="secondary">Clinic catalog</Badge>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                MediFlow uses one product plan. Set the default setup fee and
                quarterly subscription applied when onboarding new clinics.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="apex"
            className="cursor-pointer self-start rounded-xl px-4"
            onClick={() => (primary ? openEdit(primary) : openCreate())}
          >
            <Plus className="mr-2 h-4 w-4" />
            {primary ? "Update plan" : "Add pricing plan"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/55 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Catalog rules
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {rules.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Saved clinic pricing entries
            </p>
          </div>

          <div className="rounded-xl border border-[oklch(0.72_0.08_85/0.2)] bg-[oklch(0.55_0.04_85/0.08)] px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              <CircleDollarSign className="h-3.5 w-3.5 text-[oklch(0.82_0.05_85)]" />
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[oklch(0.82_0.04_85)]">
                Active setup
              </p>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {formatEtb(primary?.setup_fee_etb ?? DEFAULT_SETUP_FEE_ETB)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {primary ? "From active catalog rule" : "Fallback default"}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/14 bg-emerald-500/6 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700">
              Active quarterly
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {formatEtb(
                primary?.quarterly_fee_etb ?? DEFAULT_QUARTERLY_FEE_ETB,
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeRules.length} active · {inactiveCount} inactive
            </p>
          </div>
        </div>
      </div>

      <div className="apex-panel-surface overflow-hidden rounded-2xl border border-border">
        {rules.length === 0 ? (
          <div className="p-6">
            <ApexEmptyState
              icon={CircleDollarSign}
              title="No plan saved yet"
              description={`Defaults of ${DEFAULT_SETUP_FEE_ETB.toLocaleString()} / ${DEFAULT_QUARTERLY_FEE_ETB.toLocaleString()} ETB apply until you save a catalog rule.`}
            />
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="apex" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add pricing plan
              </Button>
            </div>
          </div>
        ) : (
          <ApexDataTable
            data={rules}
            columns={columns}
            noun="plans"
            pageSize={10}
            searchPlaceholder="Search plans, fees, description…"
            rowClassName={(row) =>
              [
                "group/price transition-all duration-150 active:scale-[0.998]",
                !row.is_active ? "opacity-55" : undefined,
              ]
                .filter(Boolean)
                .join(" ")
            }
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor.id ? "Edit clinic plan" : "Save clinic plan"}
            </DialogTitle>
            <DialogDescription>
              These fees become the default setup and quarterly amounts for new
              clinics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="setup-fee">Setup fee (ETB)</Label>
                <Input
                  id="setup-fee"
                  type="number"
                  min={0}
                  step={1000}
                  className="h-11 tabular-nums"
                  value={editor.setup_fee_etb}
                  onChange={(e) =>
                    setEditor((prev) => ({
                      ...prev,
                      setup_fee_etb: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quarterly-fee">Quarterly fee (ETB)</Label>
                <Input
                  id="quarterly-fee"
                  type="number"
                  min={0}
                  step={1000}
                  className="h-11 tabular-nums"
                  value={editor.quarterly_fee_etb}
                  onChange={(e) =>
                    setEditor((prev) => ({
                      ...prev,
                      quarterly_fee_etb: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                rows={3}
                className="resize-none"
                value={editor.description}
                onChange={(e) =>
                  setEditor((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Standard MediFlow clinic plan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="apex"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={toggleTarget != null}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
      >
        <AlertDialogContent className="border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? "Disable clinic plan?" : "Enable clinic plan?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? "New clinic signups will fall back to default fees until an active plan exists."
                : "This plan will apply to new clinic onboarding immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              variant="default"
              disabled={busy || !toggleTarget}
              onClick={() => void toggleActive()}
            >
              {busy ? "Saving…" : toggleTarget?.is_active ? "Disable plan" : "Enable plan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete clinic pricing plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Remove "${deleteTarget.description || "Clinic plan"}"? New signups will fall back to default fees until you save a new plan.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy || !deleteTarget}
              onClick={() => void removeRule()}
            >
              {busy ? "Deleting…" : "Delete plan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
