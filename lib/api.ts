import axios, { type AxiosError } from "axios";
import type {
  AnalyticsSummary,
  ApexUser,
  AuditLogRow,
  CreateTenantPayload,
  DashboardSummary,
  FeedbackDirectoryRow,
  FeedbackMessage,
  ClinicServerInfo,
  ClinicServerNode,
  OpsModeChangeRequest,
  PaymentSubmission,
  PricingRule,
  SignupRow,
  Tenant,
  TenantUserRow,
} from "./types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.split(",")[0]?.trim().replace(/\/$/, "") ||
  "http://localhost:8001/api"
);

const TOKEN_KEY = "apex_token";
const USER_KEY = "apex_user";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function getStoredUser(): ApexUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApexUser;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isUnauthenticatedError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === 401) return true;
  if (status === 403) {
    const detail = String(
      (error.response?.data as { detail?: string } | undefined)?.detail || "",
    ).toLowerCase();
    return (
      detail.includes("token") ||
      detail.includes("inactive") ||
      detail.includes("not authorized") ||
      detail.includes("apex platform")
    );
  }
  return false;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && axios.isAxiosError(error)) {
      const url = String(error.config?.url || "");
      const isLoginRequest = url.includes("/apex/auth/login/");
      if (isUnauthenticatedError(error) && !isLoginRequest) {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login");
        }
      }
    }
    return Promise.reject(error);
  },
);

export function persistSession(access: string, user: ApexUser) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function apexLogin(username: string, password: string) {
  const { data } = await api.post<{ access: string; refresh: string; user: ApexUser }>(
    "/apex/auth/login/",
    { username, password },
  );
  persistSession(data.access, data.user);
  return data;
}

export async function getApexMe() {
  const { data } = await api.get<ApexUser>("/apex/me/");
  return data;
}

export async function getDashboardSummary() {
  const { data } = await api.get<DashboardSummary>("/tenants/summary/");
  return data;
}

export async function listTenants(params?: { search?: string; status?: string }) {
  const { data } = await api.get<Tenant[]>("/tenants/", { params });
  return data;
}

export async function getTenant(tin: string) {
  const { data } = await api.get<Tenant>(`/tenants/${encodeURIComponent(tin)}/`);
  return data;
}

export type TenantBranch = {
  id: number;
  name: string;
  address?: string;
  branch_tin?: string;
  is_main?: boolean;
  is_active?: boolean;
  created_at?: string;
  demoted_mains?: string[];
};

export async function fetchTenantBranches(tin: string) {
  const { data } = await api.get<
    TenantBranch[] | { results: TenantBranch[]; has_main?: boolean }
  >(`/tenants/${encodeURIComponent(tin)}/branches/`);
  if (Array.isArray(data)) return { results: data, has_main: data.some((b) => b.is_main) };
  return {
    results: data.results ?? [],
    has_main: Boolean(data.has_main ?? (data.results ?? []).some((b) => b.is_main)),
  };
}

export async function createTenantBranch(
  tin: string,
  payload: {
    name: string;
    address?: string;
    branch_tin: string;
    is_main?: boolean;
    is_active?: boolean;
    manager_username: string;
    manager_password: string;
  },
) {
  const { data } = await api.post<TenantBranch>(
    `/tenants/${encodeURIComponent(tin)}/branches/`,
    payload,
  );
  return data;
}

export async function updateTenantBranch(
  tin: string,
  id: number,
  payload: Partial<{
    name: string;
    address: string;
    branch_tin: string;
    is_main: boolean;
    is_active: boolean;
  }>,
) {
  const { data } = await api.patch<TenantBranch>(
    `/tenants/${encodeURIComponent(tin)}/branches/${id}/`,
    payload,
  );
  return data;
}

export async function deleteTenantBranch(tin: string, id: number) {
  await api.delete(`/tenants/${encodeURIComponent(tin)}/branches/${id}/`);
}

export async function createTenant(payload: CreateTenantPayload) {
  const { data } = await api.post<Tenant>("/tenants/", payload);
  return data;
}

export async function updateTenant(
  tin: string,
  payload: Record<string, string | number | boolean | string[] | null | undefined>,
) {
  const { data } = await api.patch<Tenant>(
    `/tenants/${encodeURIComponent(tin)}/`,
    payload,
  );
  return data;
}

export async function changeTenantStatus(
  tin: string,
  action: "suspend" | "unsuspend" | "ban" | "unban" | "delete" | "restore",
  reason = "",
) {
  const { data } = await api.post<Tenant>(
    `/tenants/${encodeURIComponent(tin)}/${action}/`,
    { reason },
  );
  return data;
}

export async function listPendingPayments(kind?: "setup" | "quarterly" | "yearly") {
  const { data } = await api.get<PaymentSubmission[]>("/tenants/payments/pending/", {
    params: kind ? { kind } : undefined,
  });
  return data;
}

export async function approveSetupPayment(pharmacy_tin: string) {
  const { data } = await api.post<Tenant>("/tenants/payments/approve-setup/", {
    pharmacy_tin,
  });
  return data;
}

export async function approveQuarterlyPayment(pharmacy_tin: string) {
  const { data } = await api.post<Tenant>("/tenants/payments/approve-quarterly/", {
    pharmacy_tin,
  });
  return data;
}

export async function approveYearlyPayment(pharmacy_tin: string) {
  const { data } = await api.post<Tenant>("/tenants/payments/approve-yearly/", {
    pharmacy_tin,
  });
  return data;
}

export async function rejectPayment(submission_id: number, reason: string) {
  const { data } = await api.post<PaymentSubmission>("/tenants/payments/reject/", {
    submission_id,
    reason,
  });
  return data;
}

export async function releaseBillingHold(tin: string) {
  const { data } = await api.post<Tenant>(
    `/tenants/${encodeURIComponent(tin)}/release-hold/`,
  );
  return data;
}

export async function listPricingRules() {
  const { data } = await api.get<PricingRule[]>("/tenants/pricing/");
  return data;
}

export async function upsertPricingRule(payload: Partial<PricingRule> & { modules: string[] }) {
  const { data } = await api.post<PricingRule>("/tenants/pricing/", payload);
  return data;
}

export async function patchPricingRule(id: number, payload: Partial<PricingRule>) {
  const { data } = await api.patch<PricingRule>(`/tenants/pricing/${id}/`, payload);
  return data;
}

export async function deletePricingRule(id: number) {
  await api.delete(`/tenants/pricing/${id}/`);
}

export async function listFeedbackDirectory() {
  const { data } = await api.get<FeedbackDirectoryRow[]>("/tenants/feedback/");
  return data;
}

export async function getFeedbackThread(tin: string) {
  const { data } = await api.get<{
    thread: {
      id: number;
      pharmacy_tin: string;
      status: string;
      pharmacy_name: string;
    };
    messages: FeedbackMessage[];
  }>(`/tenants/feedback/${encodeURIComponent(tin)}/`);
  return data;
}

export async function sendFeedbackMessage(tin: string, body: string, image_url = "") {
  const { data } = await api.post<FeedbackMessage>(
    `/tenants/feedback/${encodeURIComponent(tin)}/send/`,
    { body, image_url },
  );
  return data;
}

export async function startChat(pharmacy_tin: string, body: string) {
  const { data } = await api.post("/tenants/feedback/start/", { pharmacy_tin, body });
  return data;
}

export async function broadcastChat(pharmacy_tins: string[], body: string) {
  const { data } = await api.post<{ sent: number }>("/tenants/feedback/broadcast/", {
    pharmacy_tins,
    body,
  });
  return data;
}

export async function closeFeedbackThread(tin: string) {
  const { data } = await api.post(`/tenants/feedback/${encodeURIComponent(tin)}/close/`);
  return data;
}

export async function listAuditLogs(limit = 200) {
  const { data } = await api.get<AuditLogRow[]>("/tenants/audit/", {
    params: { limit },
  });
  return data;
}

export async function listTenantUsers(search?: string) {
  const { data } = await api.get<TenantUserRow[]>("/tenants/users/", {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function setUserLoginDisabled(user_id: number, disabled: boolean) {
  const { data } = await api.post("/tenants/users/set-login-disabled/", { user_id, disabled });
  return data;
}

export async function listSignups() {
  const { data } = await api.get<SignupRow[]>("/tenants/signups/");
  return data;
}

export async function getAnalyticsSummary() {
  const { data } = await api.get<AnalyticsSummary>("/tenants/analytics/");
  return data;
}

export type SalesAgentRow = {
  id: number;
  displayName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt?: string;
  tenantCount: number;
};

export async function fetchApexSalesAgents(activeOnly = false) {
  const { data } = await api.get<SalesAgentRow[]>("/tenants/sales-agents/", {
    params: activeOnly ? { active_only: true } : undefined,
  });
  return data;
}

export async function upsertSalesAgent(input: {
  id?: number;
  displayName: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  notes?: string | null;
  isActive?: boolean;
}) {
  const { data } = await api.post<SalesAgentRow>("/tenants/sales-agents/", input);
  return data;
}

export async function setSalesAgentActive(id: number, isActive: boolean) {
  await api.patch(`/tenants/sales-agents/${id}/`, { isActive });
}

export async function deleteSalesAgent(id: number) {
  await api.delete(`/tenants/sales-agents/${id}/`);
}

export async function getClinicServer(tin: string) {
  const { data } = await api.get<ClinicServerInfo>(`/tenants/${encodeURIComponent(tin)}/sync/`);
  return data;
}

/** Issues a clinic server token. The token is returned once and never stored in readable form. */
export async function issueClinicServerToken(payload: {
  tin: string;
  branch_name: string;
  label?: string;
  replace?: boolean;
}) {
  const { data } = await api.post<{ detail: string; token: string; node: ClinicServerNode }>(
    "/tenants/sync-nodes/issue/",
    payload,
  );
  return data;
}

export async function revokeClinicServerToken(node_id: number) {
  const { data } = await api.post<{ detail: string; node: ClinicServerNode }>(
    "/tenants/sync-nodes/revoke/",
    { node_id },
  );
  return data;
}

export async function listOpsModeRequests(status: "pending" | "approved" | "all" = "pending") {
  const { data } = await api.get<OpsModeChangeRequest[]>("/tenants/ops-mode-requests/", {
    params: { status },
  });
  return data;
}

export async function approveOpsModeRequest(request_id: number, review_note = "") {
  const { data } = await api.post<{ detail: string; request: OpsModeChangeRequest }>(
    "/tenants/ops-mode-requests/approve/",
    { request_id, review_note },
  );
  return data;
}

export async function rejectOpsModeRequest(request_id: number, reason: string) {
  const { data } = await api.post<{ detail: string; request: OpsModeChangeRequest }>(
    "/tenants/ops-mode-requests/reject/",
    { request_id, reason },
  );
  return data;
}

export function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ detail?: string; [key: string]: unknown } | string>;
  const data = axiosError.response?.data;
  if (!data) return axiosError.message || "Something went wrong.";
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("<")) {
      const status = axiosError.response?.status;
      if (status === 500) {
        return "Server error — check that the API database migrations are up to date.";
      }
      if (status === 403) return "You do not have permission to perform this action.";
      if (status === 404) return "API endpoint not found — check NEXT_PUBLIC_API_URL.";
      return status ? `Request failed (${status}).` : "Request failed.";
    }
    return trimmed.slice(0, 280) || "Something went wrong.";
  }
  if (typeof data.detail === "string") return data.detail;
  const firstKey = Object.keys(data)[0];
  const value = firstKey ? data[firstKey] : null;
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === "string") return value;
  return "Request failed.";
}
