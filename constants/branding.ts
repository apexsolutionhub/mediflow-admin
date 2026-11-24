export const APEX = {
  name: "Apex Solution",
  product: "MediFlow Console",
  tagline: "Operations & monitoring",
} as const;

export const TENANT_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
  { value: "deleted", label: "Deleted" },
] as const;
