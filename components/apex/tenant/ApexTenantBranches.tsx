"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  MapPin,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ApexEmptyState } from "@/components/apex/PageChrome";
import {
  ApexTenantMetricTile,
  ApexTenantTabShell,
} from "@/components/apex/tenant/ApexTenantTabShell";
import { ApexConfirmDialog } from "@/components/apex/ApexConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  createTenantBranch,
  deleteTenantBranch,
  fetchTenantBranches,
  getErrorMessage,
  updateTenantBranch,
  type TenantBranch,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function branchInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "BR";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ApexTenantBranches({
  tin,
  onChanged,
}: {
  tin: string;
  onChanged?: () => void;
}) {
  const [branches, setBranches] = useState<TenantBranch[]>([]);
  const [hasMain, setHasMain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [branchTin, setBranchTin] = useState("");
  const [asMain, setAsMain] = useState(true);
  const [managerUsername, setManagerUsername] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  const reload = useCallback(async () => {
    const { results, has_main } = await fetchTenantBranches(tin);
    setBranches(results);
    setHasMain(has_main);
    setAsMain(!has_main);
  }, [tin]);

  const reloadAndNotify = useCallback(async () => {
    await reload();
    onChanged?.();
  }, [reload, onChanged]);

  useEffect(() => {
    setLoading(true);
    void reload()
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [reload]);

  const stats = useMemo(() => {
    const active = branches.filter((b) => b.is_active !== false).length;
    const main = branches.find((b) => b.is_main);
    return {
      total: branches.length,
      active,
      inactive: branches.length - active,
      mainName: main?.name || "—",
    };
  }, [branches]);

  const sorted = useMemo(
    () =>
      [...branches].sort((a, b) => {
        if (a.is_main && !b.is_main) return -1;
        if (!a.is_main && b.is_main) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }),
    [branches],
  );

  const create = async () => {
    if (!name.trim()) {
      toast.error("Branch name is required");
      return;
    }
    if (branchTin.trim() && hasMain && branchTin.trim().toLowerCase() === tin.trim().toLowerCase()) {
      toast.error("Satellite branches need their own TIN (different from the organization TIN)");
      return;
    }
    if (!managerUsername.trim()) {
      toast.error("Branch manager username is required");
      return;
    }
    if (managerPassword.length < 6) {
      toast.error("Branch manager password must be at least 6 characters");
      return;
    }
    const wasBlank = !branchTin.trim();
    setBusy(true);
    try {
      const created = await createTenantBranch(tin, {
        name: name.trim(),
        address: address.trim(),
        branch_tin: branchTin.trim(),
        is_main: hasMain ? false : asMain,
        manager_username: managerUsername.trim(),
        manager_password: managerPassword,
      });
      setName("");
      setAddress("");
      setBranchTin("");
      setManagerUsername("");
      setManagerPassword("");
      setAsMain(false);
      toast.success("Branch and manager created", {
        description: wasBlank
          ? `No TIN was entered, so this branch was given ${created.branch_tin}. A TIN never changes once the branch has data.`
          : undefined,
      });
      await reloadAndNotify();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ApexTenantTabShell
      title="Organization branches"
      description="Locations under this organization. Only one main branch is allowed — promoting a satellite demotes the previous main."
      icon={Building2}
      tone="teal"
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <ApexTenantMetricTile
            label="Branches"
            value={stats.total}
            sub={stats.total === 1 ? "Location on file" : "Locations on file"}
          />
          <ApexTenantMetricTile
            label="Active"
            value={stats.active}
            sub={
              stats.inactive > 0
                ? `${stats.inactive} inactive`
                : "All locations live"
            }
          />
          <ApexTenantMetricTile
            label="Main site"
            value={stats.mainName}
            sub="Primary referral hub"
          />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-[oklch(0.28_0.04_195/0.55)] via-muted/30 to-card/40 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[oklch(0.65_0.1_195/0.12)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-[oklch(0.78_0.08_85/0.1)] blur-3xl" />

          <div className="relative space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.28_0.05_195)] text-[oklch(0.9_0.04_195)] ring-1 ring-[oklch(0.62_0.12_195/0.35)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Add a branch</h3>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                  Enter the site name, its own TIN (leave it blank to generate one), and address, then create the branch manager login. A TIN cannot be changed later.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.4fr)]">
                <div className="space-y-1.5">
                  <Label htmlFor="branch-name" className="text-xs uppercase tracking-[0.1em]">
                    Branch name
                  </Label>
                  <Input
                    id="branch-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Bole branch"
                    className="h-11 rounded-xl bg-background/70"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch-tin" className="text-xs uppercase tracking-[0.1em]">
                    Branch TIN
                  </Label>
                  <Input
                    id="branch-tin"
                    value={branchTin}
                    onChange={(e) => setBranchTin(e.target.value)}
                    placeholder="Blank = auto-generate"
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-11 rounded-xl bg-background/70 font-mono tracking-wide"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch-address" className="text-xs uppercase tracking-[0.1em]">
                    Address
                  </Label>
                  <Input
                    id="branch-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Neighborhood, city, landmark"
                    className="h-11 rounded-xl bg-background/70"
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="branch-manager-user" className="text-xs uppercase tracking-[0.1em]">
                    Manager username
                  </Label>
                  <Input
                    id="branch-manager-user"
                    value={managerUsername}
                    onChange={(e) => setManagerUsername(e.target.value)}
                    placeholder="bole.manager"
                    className="h-11 rounded-xl bg-background/70"
                    disabled={busy}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch-manager-pass" className="text-xs uppercase tracking-[0.1em]">
                    Manager password
                  </Label>
                  <Input
                    id="branch-manager-pass"
                    type="password"
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl bg-background/70"
                    disabled={busy}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3.5 py-2.5",
                  hasMain ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                )}
              >
                <Switch
                  checked={hasMain ? false : asMain}
                  onCheckedChange={setAsMain}
                  disabled={busy || hasMain}
                />
                <span className="text-sm text-foreground">
                  Set as <span className="font-medium">main branch</span>
                  {hasMain ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Disabled — this tenant already has a main branch.
                    </span>
                  ) : null}
                </span>
              </label>
              <Button
                type="button"
                variant="apex"
                className="h-11 rounded-xl px-5"
                disabled={
                  busy ||
                  !name.trim() ||
                  !branchTin.trim() ||
                  !managerUsername.trim() ||
                  managerPassword.length < 6
                }
                onClick={() => void create()}
              >
                {busy ? <Spinner className="mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
                Add branch
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.78_0.06_85)]">
                Directory
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Main branch leads the list · satellite sites follow alphabetically
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[180px] items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
              <Spinner /> Loading branches…
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-2">
              <ApexEmptyState
                icon={Building2}
                title="No branches yet"
                description="Add the main clinic first, then any satellite locations used for same-org referrals."
              />
            </div>
          ) : (
            <ul className="grid gap-3">
              {sorted.map((branch) => {
                const isMain = Boolean(branch.is_main);
                const inactive = branch.is_active === false;
                return (
                  <li
                    key={branch.id}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-card/50 p-4 transition-all duration-200",
                      isMain
                        ? "border-[oklch(0.72_0.08_85/0.45)] shadow-[0_0_0_1px_oklch(0.72_0.08_85/0.12)]"
                        : "border-border/70 hover:border-border hover:bg-card/70",
                      inactive && "opacity-70",
                    )}
                  >
                    {isMain ? (
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-linear-to-b from-[oklch(0.82_0.08_85)] to-[oklch(0.65_0.1_195)]" />
                    ) : null}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <span
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold tracking-wide ring-1",
                            isMain
                              ? "bg-[oklch(0.32_0.05_85)] text-[oklch(0.92_0.05_85)] ring-[oklch(0.7_0.08_85/0.4)]"
                              : "bg-[oklch(0.28_0.05_195)] text-[oklch(0.9_0.04_195)] ring-[oklch(0.62_0.12_195/0.35)]",
                          )}
                        >
                          {branchInitials(branch.name)}
                        </span>
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-foreground">{branch.name}</p>
                            {isMain ? (
                              <Badge
                                variant="outline"
                                className="border-[oklch(0.72_0.08_85/0.45)] bg-[oklch(0.82_0.06_85)]/10 text-[oklch(0.86_0.06_85)]"
                              >
                                <Star className="mr-1 h-3 w-3 fill-current" />
                                Main
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="font-normal">
                                Satellite
                              </Badge>
                            )}
                            {inactive ? (
                              <Badge variant="destructive">Inactive</Badge>
                            ) : (
                              <Badge variant="success">Active</Badge>
                            )}
                          </div>
                          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="truncate">
                              {branch.address?.trim() || "Address not set"}
                            </span>
                          </p>
                          <p className="text-[12px] text-muted-foreground/90">
                            TIN{" "}
                            <span className="font-medium text-foreground/80">
                              {branch.branch_tin?.trim() || tin}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {!isMain ? (
                          <ApexConfirmDialog
                            title={`Make “${branch.name}” the main branch?`}
                            description="An organization can have only one main site. The current main branch will become a satellite."
                            confirmLabel="Set as main"
                            disabled={busy}
                            onConfirm={() =>
                              void (async () => {
                                setBusy(true);
                                try {
                                  const updated = await updateTenantBranch(tin, branch.id, {
                                    is_main: true,
                                  });
                                  if (updated.demoted_mains?.length) {
                                    toast.success(
                                      `${branch.name} is now main · ${updated.demoted_mains.join(", ")} moved to satellite`,
                                    );
                                  } else {
                                    toast.success(`${branch.name} is now the main branch`);
                                  }
                                  await reloadAndNotify();
                                } catch (err) {
                                  toast.error(getErrorMessage(err));
                                } finally {
                                  setBusy(false);
                                }
                              })()
                            }
                            trigger={
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                disabled={busy}
                              >
                                <Star className="mr-1.5 h-3.5 w-3.5" />
                                Set main
                              </Button>
                            }
                          />
                        ) : null}
                        <ApexConfirmDialog
                          title={`Delete “${branch.name}”?`}
                          description="Doctors will no longer see this branch in referral destinations. If this is the main branch, another site will become main automatically. This cannot be undone."
                          confirmLabel="Delete branch"
                          destructive
                          disabled={busy}
                          onConfirm={() =>
                            void (async () => {
                              setBusy(true);
                              try {
                                await deleteTenantBranch(tin, branch.id);
                                toast.success("Branch deleted");
                                await reloadAndNotify();
                              } catch (err) {
                                toast.error(getErrorMessage(err));
                              } finally {
                                setBusy(false);
                              }
                            })()
                          }
                          trigger={
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-xl text-muted-foreground hover:text-destructive"
                              disabled={busy}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete {branch.name}</span>
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </ApexTenantTabShell>
  );
}
