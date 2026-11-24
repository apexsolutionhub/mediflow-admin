"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MessageCirclePlus } from "lucide-react";
import { toast } from "sonner";
import { ApexTenantPropertyPicker } from "@/components/apex/feedback/ApexTenantPropertyPicker";
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
import { getErrorMessage, listTenants, startChat } from "@/lib/api";
import { isChatEligibleTenant } from "@/lib/tenantEligibility";

type Props = {
  defaultTin?: string;
  onDone?: () => void;
  trigger?: ReactNode;
};

export function ApexStartChatDialog({ defaultTin, onDone, trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tin, setTin] = useState("");
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<
    { pharmacy_tin: string; pharmacy_name: string }[]
  >([]);

  useEffect(() => {
    if (defaultTin) setTin(defaultTin);
  }, [defaultTin]);

  useEffect(() => {
    if (open && defaultTin) setTin(defaultTin);
  }, [open, defaultTin]);

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

  const canSubmit = Boolean(tin.trim()) && Boolean(message.trim()) && !submitting;

  const handleStart = async () => {
    if (!tin.trim()) {
      toast.error("Select a clinic");
      return;
    }
    if (!message.trim()) {
      toast.error("Enter an opening message");
      return;
    }
    setSubmitting(true);
    try {
      await startChat(tin.trim(), message.trim());
      toast.success("Chat opened");
      setOpen(false);
      setTin(defaultTin ?? "");
      setMessage("");
      onDone?.();
      router.push(`/feedback/${encodeURIComponent(tin.trim())}`);
    } catch (e) {
      toast.error(getErrorMessage(e) || "Could not start chat");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="apex" size="default" className="gap-2">
            <MessageCirclePlus className="h-4 w-4" />
            Start chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a clinic chat</DialogTitle>
          <DialogDescription>
            Pick a clinic and write your opening message — in any order. Both are
            required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="apex-chat-pharmacy">
              Clinic <span className="text-destructive">*</span>
            </Label>
            <ApexTenantPropertyPicker
              id="apex-chat-pharmacy"
              options={options}
              value={tin}
              onValueChange={setTin}
              loading={loadingTenants}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apex-chat-message">
              Opening message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="apex-chat-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi — we're checking in about your subscription…"
              rows={3}
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
            onClick={() => void handleStart()}
          >
            {submitting ? "Opening…" : "Open chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
