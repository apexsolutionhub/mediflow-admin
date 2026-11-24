"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { ApexTenantMultiPropertyPicker } from "@/components/apex/feedback/ApexTenantMultiPropertyPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { broadcastChat, getErrorMessage, listTenants } from "@/lib/api";
import { isChatEligibleTenant } from "@/lib/tenantEligibility";

type Props = {
  onDone?: () => void;
};

export function ApexBroadcastChatDialog({ onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tins, setTins] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<
    { pharmacy_tin: string; pharmacy_name: string }[]
  >([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoadingTenants(true);
      try {
        const list = await listTenants();
        setOptions(
          list
            .filter(isChatEligibleTenant)
            .map((t) => ({
              pharmacy_tin: t.pharmacy_tin,
              pharmacy_name: t.pharmacy_name,
            }))
            .sort((a, b) => a.pharmacy_name.localeCompare(b.pharmacy_name)),
        );
      } catch (e) {
        toast.error(getErrorMessage(e) || "Could not load clinics");
      } finally {
        setLoadingTenants(false);
      }
    })();
  }, [open]);

  const canSubmit =
    tins.length > 0 && Boolean(message.trim()) && !submitting && !loadingTenants;

  const handleBroadcast = async () => {
    if (tins.length === 0) {
      toast.error("Select at least one clinic");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter a broadcast message");
      return;
    }
    setSubmitting(true);
    try {
      const result = await broadcastChat(tins, message.trim());
      const sent = result.sent ?? 0;
      if (sent > 0) {
        toast.success(
          `Broadcast sent to ${sent} clinic${sent === 1 ? "" : "s"}`,
        );
      } else {
        toast.error("Broadcast failed for all clinics");
      }
      setOpen(false);
      setTins([]);
      setMessage("");
      onDone?.();
    } catch (e) {
      toast.error(getErrorMessage(e) || "Broadcast failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTins([]);
          setMessage("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Broadcast
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Broadcast to clinics</DialogTitle>
          <DialogDescription>
            Select the tenants that should receive this message. Each selected
            clinic gets its own chat thread with the same opening message.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="apex-broadcast-pharmacies">
              Clinics <span className="text-destructive">*</span>
            </Label>
            <ApexTenantMultiPropertyPicker
              id="apex-broadcast-pharmacies"
              options={options}
              value={tins}
              onValueChange={setTins}
              loading={loadingTenants}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Only active tenants appear here. Max 50 per broadcast.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="apex-broadcast-message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="apex-broadcast-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Announcement for selected clinics…"
              rows={4}
              disabled={submitting}
              className="w-full resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="apex"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!canSubmit}
            onClick={() => void handleBroadcast()}
          >
            {submitting
              ? "Sending…"
              : tins.length > 0
                ? `Send to ${tins.length}`
                : "Send broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
