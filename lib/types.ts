export type OpsModeChangeRequest = {
  id: number;
  pharmacy_tin: string;
  pharmacy_name?: string;
  current_ops_mode: "online" | "offline" | string;
  requested_ops_mode: "online" | "offline" | string;
  request_note?: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "applied" | string;
  requested_by_username?: string;
  review_note?: string;
  reviewed_at?: string | null;
  applied_at?: string | null;
  created_at: string;
  updated_at?: string;
  /** Always false: no change applies on approval alone. */
  applies_immediately?: boolean;
  /** What an approved change waits for: the clinic server's first seed, or a final sync. */
  awaiting_step?: "seed" | "sync" | null;
  server?: ClinicServerSummary | null;
};

export type ClinicServerSummary = {
  active_nodes: number;
  seeded_at: string | null;
  last_successful_sync_at: string | null;
};

export type ClinicServerNode = {
  id: number;
  branch_name: string;
  label: string;
  token_prefix: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
};

/** A clinic server token handed over right after Apex creates or approves an offline clinic. Shown once. */
export type IssuedServerToken = {
  token: string;
  branch_name: string;
  node: ClinicServerNode;
  /** Filled by the client: which clinic it belongs to. */
  tin?: string;
};

export type ClinicServerInfo = {
  tin: string;
  clinic_name: string;
  ops_mode: string;
  default_branch: string;
  nodes: ClinicServerNode[];
  states: {
    branch_name: string;
    seeded_at: string | null;
    last_successful_sync_at: string | null;
    restore_pending: boolean;
  }[];
  open_conflicts: number;
  runs: {
    id: string;
    branch_name: string;
    kind: "sync" | "seed" | string;
    push_status: string;
    pull_status: string;
    error_message: string;
    started_at: string;
    finished_at: string | null;
  }[];
};

export type ApexUser = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_superadmin: boolean;
  actor_type: string;
};

export type PaymentSubmission = {
  id: number;
  pharmacy_tin: string;
  pharmacy_name?: string;
  payment_kind: "setup" | "quarterly" | "yearly" | string;
  amount_etb: number;
  payment_channel: string;
  transaction_ref: string;
  status: "pending" | "approved" | "rejected" | string;
  submitted_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string;
  quarter_number?: number | null;
};

export type TenantBranchSummary = {
  id: number;
  name: string;
  address?: string;
  branch_tin: string;
  is_main?: boolean;
  is_active?: boolean;
};

export type Tenant = {
  id: number;
  pharmacy_tin: string;
  pharmacy_name: string;
  phone?: string;
  logo_url: string;
  account_status: "active" | "suspended" | "banned" | "deleted" | string;
  status_reason: string;
  status_changed_at: string | null;
  setup_fee_etb?: number;
  quarterly_fee_etb?: number;
  yearly_fee_etb?: number;
  payment_channel?: string;
  payment_transaction_ref?: string;
  setup_fee_approved?: boolean;
  subscription_payment_approved?: boolean;
  subscription_paid_until?: string | null;
  paid_quarters_count?: number;
  billing_hold?: boolean;
  billing_started_at?: string | null;
  free_trial_ends_at?: string | null;
  is_illustration?: boolean;
  provisioned_by_apex?: boolean;
  billing_notes?: string;
  modules?: string[];
  fees_manually_set?: boolean;
  ops_mode?: "online" | "offline" | string;
  created_at: string;
  updated_at: string;
  manager_count?: number;
  manager_username?: string;
  pharmacist_count?: number;
  staff_count?: number;
  setup_review_status?: "pending" | "approved" | "rejected" | string;
  branch_name?: string;
  branch_count?: number;
  branches?: TenantBranchSummary[];
  staff?: TenantStaff[];
  payments?: PaymentSubmission[];
};

export type TenantStaff = {
  id: number;
  username: string;
  role: string;
  pharmacy_name: string;
  logoUrl: string;
  pharmacy_tin: string;
  branch_name?: string;
  login_disabled?: boolean;
};

export type CreateTenantPayload = {
  pharmacy_tin: string;
  pharmacy_name: string;
  logo_url?: string;
  manager_username: string;
  manager_password: string;
  branch_name?: string;
  branch_address?: string;
  is_main_branch?: boolean;
  setup_fee_etb?: number;
  quarterly_fee_etb?: number;
  yearly_fee_etb?: number;
  modules?: string[];
  waive_setup_fee?: boolean;
  sales_agent_id?: number | null;
  ops_mode?: "online" | "offline";
};

export type DashboardSummary = {
  tenants_total: number;
  tenants_active: number;
  suspended_tenants?: number;
  banned_tenants?: number;
  inactive_tenants?: number;
  pending_setup_payments: number;
  pending_quarterly_payments: number;
  pending_yearly_payments?: number;
  setup_pending_tenants?: number;
  unread_feedback?: number;
  disabled_users?: number;
  pending_ops_mode_requests?: number;
};

export type PricingRule = {
  id: number;
  business_type: string;
  modules_key: string;
  modules: string[];
  setup_fee_etb: number;
  quarterly_fee_etb: number;
  yearly_fee_etb: number;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FeedbackDirectoryRow = {
  pharmacy_tin: string;
  pharmacy_name: string;
  logo_url?: string;
  account_status: string;
  thread_id: number | null;
  thread_status: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message?: {
    body: string;
    sender_side: string;
    created_at: string;
  } | null;
};

export type FeedbackMessage = {
  id: number;
  sender_side: "tenant" | "apex" | string;
  body: string;
  image_url?: string;
  sender_username: string;
  created_at: string;
  read_by_tenant?: boolean;
  read_by_apex?: boolean;
};

export type AuditLogRow = {
  id: number;
  action: string;
  pharmacy_tin: string;
  actor_username: string;
  detail: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TenantUserRow = {
  id: number;
  username: string;
  role: string;
  pharmacy_tin: string;
  pharmacy_name: string;
  branch_name?: string;
  org_tin?: string;
  is_main_branch?: boolean;
  is_active: boolean;
  login_disabled: boolean;
};

export type SignupReviewStatus = "pending" | "approved" | "rejected";

export type SignupRow = {
  pharmacy_tin: string;
  pharmacy_name: string;
  created_at: string;
  setup_fee_etb: number;
  free_trial_ends_at: string | null;
  payment_transaction_ref: string;
  payment_channel: string;
  has_pending_submission: boolean;
  pending_setup_payment_id?: number | null;
  status: SignupReviewStatus;
  manager_username?: string;
};

export type AnalyticsSummary = {
  tenants_by_status: Record<string, number>;
  approved_payments_by_kind: Record<string, number>;
  open_threads: number;
  pricing_rules_active: number;
};
