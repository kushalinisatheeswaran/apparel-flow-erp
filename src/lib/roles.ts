export type UserRole = "cutting_supervisor" | "cutting_verifier" | "sewing_supervisor";

export const USER_ROLES: UserRole[] = [
  "cutting_supervisor",
  "cutting_verifier",
  "sewing_supervisor",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  cutting_supervisor: "Cutting Supervisor",
  cutting_verifier: "Cutting Verifier",
  sewing_supervisor: "Sewing Supervisor",
};

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  cutting_supervisor: "/supervisor",
  cutting_verifier: "/verifier",
  sewing_supervisor: "/sewing",
};

export function getDashboardForRole(role: UserRole | string | undefined | null): string {
  if (role && role in ROLE_DASHBOARDS) {
    return ROLE_DASHBOARDS[role as UserRole];
  }
  return "/login";
}
