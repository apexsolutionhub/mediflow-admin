"use client";

import { Cloud, HardDrive } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  CLINIC_OPS_MODE_SHORT_LABELS,
  parseClinicOpsMode,
} from "@/lib/clinicOpsMode";
import { cn } from "@/lib/utils";

export function OpsModePill({
  mode,
  className,
}: {
  mode: string;
  className?: string;
}) {
  const parsed = parseClinicOpsMode(mode);
  const offline = parsed === "offline";
  const Icon = offline ? HardDrive : Cloud;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-transparent font-semibold",
        offline
          ? "bg-[oklch(0.55_0.04_85/0.12)] text-[oklch(0.86_0.03_85)] ring-1 ring-[oklch(0.62_0.04_85/0.22)]"
          : "bg-[oklch(0.5_0.035_220/0.12)] text-[oklch(0.84_0.025_220)] ring-1 ring-[oklch(0.55_0.04_220/0.2)]",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {CLINIC_OPS_MODE_SHORT_LABELS[parsed]}
    </Badge>
  );
}

export function OpsModeStatusBadge({
  status,
  awaitingStep,
}: {
  status: string;
  /** What an approved change is still waiting for on the clinic's side. */
  awaitingStep?: "seed" | "sync" | null;
}) {
  const normalized = status.toLowerCase();
  if (normalized === "pending") return <Badge variant="warning">Pending</Badge>;
  if (normalized === "approved") {
    return (
      <Badge variant="warning">
        {awaitingStep === "seed" ? "Approved · waiting for seed" : awaitingStep === "sync" ? "Approved · waiting for sync" : "Approved"}
      </Badge>
    );
  }
  if (normalized === "applied") return <Badge variant="secondary">Applied</Badge>;
  if (normalized === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return (
    <Badge variant="outline" className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
