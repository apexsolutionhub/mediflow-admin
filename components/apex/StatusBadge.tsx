import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tenant } from "@/lib/types";
import { isApexProvisionedTenant } from "@/lib/tenantProvisioning";

const ACCOUNT_LABELS: Record<string, string> = {
  active: "Active",
  suspended: "Suspended",
  banned: "Banned",
  deleted: "Deleted",
};

const subscriptionStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25",
  exempt: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/22",
  trial: "bg-[oklch(0.55_0.04_85/0.12)] text-[oklch(0.86_0.03_85)] ring-1 ring-[oklch(0.6_0.04_85/0.22)]",
  warning: "bg-[oklch(0.55_0.04_75/0.12)] text-[oklch(0.85_0.03_75)] ring-1 ring-[oklch(0.6_0.04_75/0.22)]",
  grace: "bg-[oklch(0.52_0.04_55/0.12)] text-[oklch(0.84_0.03_55)] ring-1 ring-[oklch(0.58_0.04_55/0.2)]",
  setup_pending:
    "bg-[oklch(0.55_0.04_85/0.12)] text-[oklch(0.86_0.03_85)] ring-1 ring-[oklch(0.62_0.04_85/0.22)]",
  pending_approval:
    "bg-[oklch(0.5_0.035_220/0.12)] text-[oklch(0.84_0.025_220)] ring-1 ring-[oklch(0.55_0.04_220/0.2)]",
  expired: "bg-[oklch(0.5_0.05_25/0.12)] text-[oklch(0.82_0.03_25)] ring-1 ring-[oklch(0.55_0.05_25/0.22)]",
  on_hold: "bg-[oklch(0.48_0.03_265/0.15)] text-[oklch(0.82_0.02_85)] ring-1 ring-[oklch(0.5_0.02_265/0.25)]",
  rejected: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/25",
  trial_expired:
    "bg-[oklch(0.48_0.02_160/0.18)] text-[oklch(0.78_0.02_85)] ring-1 ring-[oklch(0.5_0.02_160/0.28)]",
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  setup_pending: "Setup pending",
  pending_approval: "Payment pending",
  rejected: "Setup rejected",
  active: "Active",
  warning: "Renewal soon",
  grace: "Grace period",
  expired: "Expired",
  on_hold: "Billing hold",
  trial: "Free trial",
  trial_expired: "Trial expired",
  exempt: "Exempt",
};

const setupReviewStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25",
  approved: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25",
  rejected: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/25",
};

const SETUP_REVIEW_LABELS: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

const accountStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25",
  suspended:
    "bg-[oklch(0.55_0.04_75/0.12)] text-[oklch(0.85_0.03_75)] ring-1 ring-[oklch(0.6_0.04_75/0.2)]",
  banned:
    "bg-[oklch(0.5_0.05_25/0.12)] text-[oklch(0.82_0.03_25)] ring-1 ring-[oklch(0.55_0.05_25/0.22)]",
  deleted:
    "bg-[oklch(0.48_0.02_160/0.18)] text-[oklch(0.78_0.02_85)] ring-1 ring-[oklch(0.5_0.02_160/0.28)]",
};

const billingStyles: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25",
  pending:
    "bg-[oklch(0.55_0.04_85/0.12)] text-[oklch(0.86_0.03_85)] ring-1 ring-[oklch(0.62_0.04_85/0.22)]",
  trial:
    "bg-[oklch(0.55_0.04_85/0.12)] text-[oklch(0.86_0.03_85)] ring-1 ring-[oklch(0.6_0.04_85/0.22)]",
  hold: "bg-[oklch(0.48_0.03_160/0.15)] text-[oklch(0.82_0.02_85)] ring-1 ring-[oklch(0.5_0.02_160/0.25)]",
};

export function AccountStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-medium",
        accountStyles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {ACCOUNT_LABELS[status] ?? status}
    </Badge>
  );
}

export function SetupReviewStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-medium",
        setupReviewStyles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {SETUP_REVIEW_LABELS[status] ?? status}
    </Badge>
  );
}

export function TenantAccountColumnBadge({ tenant }: { tenant: Tenant }) {
  const accountStatus = String(tenant.account_status || "").toLowerCase();

  if (["suspended", "banned", "deleted"].includes(accountStatus)) {
    return <AccountStatusBadge status={accountStatus} />;
  }

  if (tenant.is_illustration || isApexProvisionedTenant(tenant)) {
    return <AccountStatusBadge status={tenant.account_status || "active"} />;
  }

  const setupReview = resolveSetupReviewStatus(tenant);

  if (setupReview === "rejected") {
    return <SetupReviewStatusBadge status="rejected" />;
  }

  if (setupReview === "pending") {
    return <SetupReviewStatusBadge status="pending" />;
  }

  return <AccountStatusBadge status={tenant.account_status || "active"} />;
}

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

export function SubscriptionStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-medium",
        subscriptionStyles[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {SUBSCRIPTION_LABELS[status] ?? status}
    </Badge>
  );
}

export function SetupStatusBadge({
  approved,
  trialEndsAt,
}: {
  approved?: boolean;
  trialEndsAt?: string | null;
}) {
  if (approved) {
    return (
      <Badge variant="outline" className={cn("border-transparent font-medium", billingStyles.approved)}>
        Setup approved
      </Badge>
    );
  }
  if (trialEndsAt) {
    return (
      <Badge variant="outline" className={cn("border-transparent font-medium", billingStyles.trial)}>
        Free trial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", billingStyles.pending)}>
      Setup pending
    </Badge>
  );
}

export function SignupReviewStatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected" | string;
}) {
  if (status === "approved") {
    return <Badge variant="success">Approved</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="warning">Pending</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "paid") {
    return <Badge variant="success">Approved</Badge>;
  }
  if (normalized === "pending") {
    return <Badge variant="warning">Pending</Badge>;
  }
  if (normalized === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return (
    <Badge variant="outline" className="capitalize">
      {status}
    </Badge>
  );
}

export function PricingRuleStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="outline">Inactive</Badge>
  );
}

export function ChatStatusBadge({
  threadId,
  status,
}: {
  threadId: number | null;
  status: string | null;
}) {
  if (!threadId) {
    return <Badge variant="outline">No chat</Badge>;
  }
  if (String(status || "").toLowerCase() === "closed") {
    return <Badge variant="outline">Closed</Badge>;
  }
  return <Badge variant="success">Open</Badge>;
}

export function TabCountBadge({ count }: { count: number }) {
  return (
    <Badge
      variant="secondary"
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
    >
      {count}
    </Badge>
  );
}
