"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SERVER_TOKEN_EVENT } from "@/lib/api";
import type { IssuedServerToken } from "@/lib/types";

/**
 * Shows a clinic server token the moment Apex creates or approves an offline clinic (see announceServerToken in
 * lib/api.ts). The token cannot be recovered afterwards, so closing needs a deliberate click.
 */
export function ServerTokenReveal() {
  const [issued, setIssued] = useState<IssuedServerToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onToken = (event: Event) => {
      setIssued((event as CustomEvent<IssuedServerToken>).detail);
      setCopied(false);
      setError(false);
    };
    window.addEventListener(SERVER_TOKEN_EVENT, onToken);
    return () => window.removeEventListener(SERVER_TOKEN_EVENT, onToken);
  }, []);

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.token);
      setCopied(true);
      setError(false);
    } catch {
      setError(true);
    }
  };

  return (
    <Dialog
      open={issued !== null}
      // Not closable by a stray click: the token is shown only now.
      onOpenChange={() => undefined}
    >
      <DialogContent
        className="sm:max-w-xl"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Clinic server token
          </DialogTitle>
          <DialogDescription>
            {issued?.tin ? `TIN ${issued.tin} · ` : ""}
            branch {issued?.branch_name || "Main"}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-500/40 bg-amber-500/10">
          <KeyRound className="size-4" />
          <AlertTitle>Copy this token now</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              It is shown once and cannot be recovered. Give it to the clinic: they put it in{" "}
              <span className="font-mono">NODE_TOKEN</span> when installing the clinic server.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-md bg-background px-3 py-2 font-mono text-xs">
                {issued?.token}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {error ? (
              <p className="text-xs text-destructive">
                Could not copy. Select the token and copy it by hand.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>

        <p className="text-xs text-muted-foreground">
          If it is lost, open the clinic&apos;s Clinic server panel, revoke it and issue a new one.
        </p>

        <DialogFooter>
          <Button type="button" onClick={() => setIssued(null)}>
            I have saved it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
