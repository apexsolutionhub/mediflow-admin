"use client";

import { Cloud, HardDrive } from "lucide-react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CLINIC_OPS_MODE_DESCRIPTIONS,
  CLINIC_OPS_MODE_LABELS,
  type ClinicOpsMode,
} from "@/lib/clinicOpsMode";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ClinicOpsMode; icon: typeof Cloud }[] = [
  { value: "online", icon: Cloud },
  { value: "offline", icon: HardDrive },
];

export function ClinicOpsModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: ClinicOpsMode;
  onChange: (next: ClinicOpsMode) => void;
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      className="grid gap-3 sm:grid-cols-2"
      value={value}
      onValueChange={(next) => onChange(next as ClinicOpsMode)}
      disabled={disabled}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;
        return (
          <Label
            key={option.value}
            htmlFor={`ops-mode-${option.value}`}
            className={cn(
              "flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id={`ops-mode-${option.value}`} value={option.value} />
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {CLINIC_OPS_MODE_LABELS[option.value]}
              </span>
            </div>
            <p className="pl-6 text-sm leading-relaxed text-muted-foreground">
              {CLINIC_OPS_MODE_DESCRIPTIONS[option.value]}
            </p>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
