"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Server,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  getClinicServer,
  getErrorMessage,
  issueClinicServerToken,
  revokeClinicServerToken,
} from "@/lib/api";
import type { ClinicServerInfo, ClinicServerNode } from "@/lib/types";

function when(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

/**
 * Apex view of one clinic's server (docs/OFFLINE_SYNC_CONTRACT.md): issue or revoke the token its
 * reception PC uses to sync a branch, and see whether it has seeded and synced.
 */
export function ClinicServerDialog({
  tin,
  open,
  onOpenChange,
  onChanged,
}: {
  tin: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {/* The body mounts only while the dialog is open, so its state starts fresh every time. */}
        {tin ? <ClinicServerBody tin={tin} onChanged={onChanged} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ClinicServerBody({
  tin,
  onChanged,
}: {
  tin: string;
  onChanged?: () => void;
}) {
  const [info, setInfo] = useState<ClinicServerInfo | null>(null);
  const [branch, setBranch] = useState("");
  const [label, setLabel] = useState("Reception PC");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [revoking, setRevoking] = useState<ClinicServerNode | null>(null);

  // Reload after an action (issue, revoke).
  const load = useCallback(async () => {
    try {
      setInfo(await getClinicServer(tin));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [tin]);

  // First load: state is set only when the request answers.
  useEffect(() => {
    let cancelled = false;
    getClinicServer(tin)
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setBranch((current) => current || data.default_branch);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [tin]);

  const issue = async (replace: boolean) => {
    setBusy(true);
    try {
      const result = await issueClinicServerToken({
        tin,
        branch_name: branch.trim(),
        label: label.trim(),
        replace,
      });
      setToken(result.token);
      setCopied(false);
      toast.success("Token issued");
      await load();
      onChanged?.();
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.data?.code === "node_exists"
      ) {
        setConfirmReplace(true);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const node = revoking;
    if (!node) return;
    setBusy(true);
    try {
      await revokeClinicServerToken(node.id);
      toast.success("Token revoked");
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
      setRevoking(null);
    }
  };

  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      toast.error("Could not copy. Select the token and copy it by hand.");
    }
  };

  const activeNodes = info?.nodes.filter((n) => n.is_active) ?? [];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Server className="size-5" />
          Clinic server
        </DialogTitle>
        <DialogDescription>
          {info
            ? `${info.clinic_name || "Clinic"} · TIN ${info.tin}`
            : "Loading…"}{" "}
          — the reception PC that runs this clinic offline syncs with the cloud
          using one token per branch.
        </DialogDescription>
      </DialogHeader>

      {!info ? (
        <div className="flex min-h-24 items-center justify-center gap-2 text-muted-foreground">
          <Spinner /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Status</h3>
            {info.states.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This clinic&apos;s server has not connected yet. After you issue
                a token, the clinic installs the server and runs the initial
                seed.
              </p>
            ) : (
              info.states.map((s) => (
                <div
                  key={s.branch_name}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium">{s.branch_name || "Main"}</span>
                  <Badge variant={s.seeded_at ? "success" : "warning"}>
                    {s.seeded_at ? "Seeded" : "Not seeded"}
                  </Badge>
                  <span className="text-muted-foreground">
                    Last sync: {when(s.last_successful_sync_at)}
                  </span>
                  {s.restore_pending ? (
                    <Badge variant="destructive">Restored · needs sync</Badge>
                  ) : null}
                </div>
              ))
            )}
            {info.open_conflicts > 0 ? (
              <p className="text-sm text-amber-500">
                {info.open_conflicts} open sync conflict(s) for the manager to
                review.
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Tokens</h3>
            {info.nodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No token issued yet.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {info.nodes.map((n) => (
                  <li
                    key={n.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {n.branch_name || "Main"}
                        {n.label ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {n.label}
                          </span>
                        ) : null}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {n.token_prefix}… · issued {when(n.created_at)} · last
                        seen {when(n.last_seen_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={n.is_active ? "success" : "outline"}>
                        {n.is_active ? "Active" : "Revoked"}
                      </Badge>
                      {n.is_active ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setRevoking(n)}
                        >
                          <ShieldOff className="size-4" />
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {token ? (
            <Alert className="border-amber-500/40 bg-amber-500/10">
              <KeyRound className="size-4" />
              <AlertTitle>Copy this token now</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  It is shown once and cannot be recovered. Give it to the
                  clinic to enter during install.
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md bg-background px-3 py-2 font-mono text-xs">
                    {token}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copy()}
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Issue a token</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="srv-branch">Branch name</Label>
                <Input
                  id="srv-branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  Must match the branch name the clinic enters at install.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="srv-label">Label</Label>
                <Input
                  id="srv-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={busy || !branch.trim()}
              onClick={() => void issue(false)}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Issue token
            </Button>
            {activeNodes.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                A branch can have one active token. Issuing for a branch that
                has one asks before replacing it.
              </p>
            ) : null}
          </section>

          {info.runs.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Recent syncs</h3>
              <ul className="space-y-1.5 text-sm">
                {info.runs.slice(0, 5).map((r) => {
                  const ok = r.pull_status === "ok";
                  const failed =
                    r.push_status === "failed" || r.pull_status === "failed";
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Badge
                        variant={
                          ok ? "success" : failed ? "destructive" : "warning"
                        }
                      >
                        {ok ? "Complete" : failed ? "Failed" : "Running"}
                      </Badge>
                      <span>
                        {r.kind === "seed" ? "Initial seed" : "Sync"} ·{" "}
                        {r.branch_name || "Main"} · {when(r.started_at)}
                      </span>
                      {failed && r.error_message ? (
                        <span className="text-xs text-muted-foreground">
                          {r.error_message}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the active token?</AlertDialogTitle>
            <AlertDialogDescription>
              This branch already has an active token. Replacing it stops the
              current clinic server from syncing until it is given the new
              token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the current token</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmReplace(false);
                void issue(true);
              }}
            >
              Replace it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revoking !== null}
        onOpenChange={(o) => (!o ? setRevoking(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this token?</AlertDialogTitle>
            <AlertDialogDescription>
              The clinic server for {revoking?.branch_name || "this branch"} can
              no longer sync. Staff keep working on it until the sync-freshness
              limit runs out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void revoke()}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
