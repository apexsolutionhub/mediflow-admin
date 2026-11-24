import type { Tenant } from "@/lib/types";

/** MediFlow self-signup clinics awaiting setup approval. */
export function isSelfSignupTenant(tenant: Tenant): boolean {
  if (tenant.is_illustration) return false;
  if (tenant.provisioned_by_apex) return false;
  if (tenant.free_trial_ends_at && !tenant.setup_fee_approved) return true;
  return !tenant.setup_fee_approved;
}

/** Created directly in mediflow_admin (or illustration seed), not via public signup. */
export function isApexProvisionedTenant(tenant: Tenant): boolean {
  if (tenant.is_illustration) return true;
  return Boolean(tenant.provisioned_by_apex);
}
