export const ROLE_RANK: Record<string, number> = {
  MANAGER: 1,
  EXECUTIVE: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function resolveRoleRank(role: unknown): number {
  if (typeof role !== "string") return 0;
  return ROLE_RANK[role] ?? 0;
}
