"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
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
import { Spinner } from "@/components/ui/spinner";
import { createTenant, fetchApexSalesAgents, getErrorMessage, type SalesAgentRow } from "@/lib/api";
import { SalesAgentSelector } from "@/components/signup/SalesAgentSelector";
import { ClinicOpsModeSelector } from "@/components/signup/ClinicOpsModeSelector";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CLINIC_OPS_MODE,
  type ClinicOpsMode,
} from "@/lib/clinicOpsMode";

const createSchema = z.object({
  pharmacy_tin: z.string().min(1, "TIN is required"),
  pharmacy_name: z.string().min(1, "Clinic name is required"),
  logo_url: z.string().optional(),
  manager_username: z.string().min(1, "Manager username is required"),
  manager_password: z.string().min(6, "Password must be at least 6 characters"),
  branch_name: z.string().min(1, "Branch name is required"),
  branch_address: z.string().optional(),
  is_main_branch: z.boolean().optional(),
  waive_setup_fee: z.boolean().optional(),
  sales_agent_id: z.number().int().positive().nullable().optional(),
  ops_mode: z.enum(["online", "offline"]),
});

type CreateValues = z.infer<typeof createSchema>;

type Props = {
  onCreated?: () => void;
  trigger?: ReactNode;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "apex" | "outline";
  children?: ReactNode;
};

export function ApexCreateTenantDialog({
  onCreated,
  trigger,
  size = "sm",
  variant = "apex",
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<SalesAgentRow[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      pharmacy_tin: "",
      pharmacy_name: "",
      logo_url: "",
      manager_username: "",
      manager_password: "",
      branch_name: "",
      branch_address: "",
      is_main_branch: true,
      waive_setup_fee: false,
      sales_agent_id: null,
      ops_mode: DEFAULT_CLINIC_OPS_MODE,
    },
  });

  useEffect(() => {
    if (!open) return;
    let active = true;
    setAgentsLoading(true);
    void fetchApexSalesAgents(true)
      .then((rows) => {
        if (active) setAgents(rows);
      })
      .catch(() => {
        if (active) setAgents([]);
      })
      .finally(() => {
        if (active) setAgentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  async function onCreate(values: CreateValues) {
    try {
      await createTenant({
        pharmacy_tin: values.pharmacy_tin.trim(),
        pharmacy_name: values.pharmacy_name.trim(),
        logo_url: values.logo_url?.trim() || "",
        manager_username: values.manager_username.trim(),
        manager_password: values.manager_password,
        branch_name: values.branch_name.trim(),
        branch_address: values.branch_address?.trim() || "",
        is_main_branch: values.is_main_branch !== false,
        waive_setup_fee: Boolean(values.waive_setup_fee),
        sales_agent_id: values.sales_agent_id ?? null,
        ops_mode: values.ops_mode as ClinicOpsMode,
      });
      toast.success("Tenant created");
      form.reset();
      setOpen(false);
      onCreated?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={variant} size={size}>
            <PlusIcon className="size-4" />
            {children ?? "Create tenant"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New clinic tenant</DialogTitle>
          <DialogDescription>
            Creates a TenantAccount and the first manager login for MediFlow.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CustomFormField
              control={form.control}
              name="pharmacy_tin"
              fieldType={formFieldTypes.INPUT}
              label="Clinic TIN"
              placeholder="0068194361"
            />
            <CustomFormField
              control={form.control}
              name="pharmacy_name"
              fieldType={formFieldTypes.INPUT}
              label="Clinic name"
              placeholder="Sunrise Clinic"
            />
            <CustomFormField
              control={form.control}
              name="logo_url"
              fieldType={formFieldTypes.IMAGE_UPLOADER}
              label="Logo"
              placeholder="Upload clinic logo"
              className="sm:col-span-2"
            />
            <CustomFormField
              control={form.control}
              name="manager_username"
              fieldType={formFieldTypes.INPUT}
              label="Manager username"
              placeholder="manager"
            />
            <CustomFormField
              control={form.control}
              name="manager_password"
              fieldType={formFieldTypes.INPUT}
              type="password"
              label="Manager password"
              placeholder="••••••••"
            />
            <CustomFormField
              control={form.control}
              name="branch_name"
              fieldType={formFieldTypes.INPUT}
              label="Branch name"
              placeholder="e.g. Bole"
            />
            <CustomFormField
              control={form.control}
              name="branch_address"
              fieldType={formFieldTypes.INPUT}
              label="Branch address"
              placeholder="Neighborhood, city, landmark"
            />
            <CustomFormField
              control={form.control}
              name="is_main_branch"
              fieldType={formFieldTypes.SWITCH}
              label="Main branch"
              description="On by default. Turn off only if this location is a satellite site."
              className="sm:col-span-2"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label>Clinic operations mode</Label>
              <p className="text-xs text-muted-foreground">
                Online cloud, or offline local DB with evening/night sync.
              </p>
              <ClinicOpsModeSelector
                value={(form.watch("ops_mode") as ClinicOpsMode) || DEFAULT_CLINIC_OPS_MODE}
                onChange={(next) => form.setValue("ops_mode", next)}
              />
            </div>
            <CustomFormField
              control={form.control}
              name="waive_setup_fee"
              fieldType={formFieldTypes.SWITCH}
              label="Waive setup fee"
              description="Approve setup immediately (skip payment portal)."
              className="sm:col-span-2"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label>Sales agent (optional)</Label>
              <SalesAgentSelector
                value={form.watch("sales_agent_id") ?? null}
                onChange={(next) => form.setValue("sales_agent_id", next)}
                agents={agents}
                loading={agentsLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Spinner />
                  Creating…
                </>
              ) : (
                "Create tenant + manager"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
