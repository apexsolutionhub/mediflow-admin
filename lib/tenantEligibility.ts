import type { Tenant } from "@/lib/types";
import { isApexProvisionedTenant } from "@/lib/tenantProvisioning";

function resolveSetupReviewStatus(tenant: Tenant): string {
  if (tenant.setup_review_status) return String(tenant.setup_review_status).toLowerCase();
  if (tenant.setup_fee_approved) return "approved";

  const setupPayments = (tenant.payments ?? []).filter(
    (payment) => payment.payment_kind === "setup",
  );
  if (setupPayments.some((payment) => payment.status === "pending")) return "pending";
  const latest = setupPayments[0];
  if (latest?.status === "rejected") return "rejected";
  return "pending";
}

/** Clinics that are live on MediFlow (approved or exempt), not pending/rejected signups. */
export function isOperationalClinicTenant(tenant: Tenant): boolean {
  if (String(tenant.account_status || "").toLowerCase() !== "active") return false;
  if (isApexProvisionedTenant(tenant)) return true;
  if (tenant.setup_fee_approved) return true;
  return resolveSetupReviewStatus(tenant) === "approved";
}

export function isChatEligibleTenant(tenant: Tenant): boolean {
  return isOperationalClinicTenant(tenant);
}
