"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TenantPickerOption = {
  pharmacy_tin: string;
  pharmacy_name: string;
};

type Props = {
  options: TenantPickerOption[];
  value: string;
  onValueChange: (tin: string) => void;
  disabled?: boolean;
  loading?: boolean;
  id?: string;
};

export function ApexTenantPropertyPicker({
  options,
  value,
  onValueChange,
  disabled,
  loading,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((o) => o.pharmacy_tin === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="h-11 w-full cursor-pointer justify-between font-normal shadow-sm"
        >
          {loading
            ? "Loading clinics…"
            : selected
              ? `${selected.pharmacy_name} (${selected.pharmacy_tin})`
              : "Select clinic…"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search name or TIN…" />
          <CommandList>
            <CommandEmpty>No clinic found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.pharmacy_tin}
                  value={`${o.pharmacy_name} ${o.pharmacy_tin}`}
                  onSelect={() => {
                    onValueChange(o.pharmacy_tin);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === o.pharmacy_tin ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{o.pharmacy_name}</span>
                  <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                    {o.pharmacy_tin}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
