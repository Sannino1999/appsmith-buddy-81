export type AdminRole = "admin" | "operator" | "viewer";

const RANK: Record<AdminRole, number> = {
  viewer: 10,
  operator: 20,
  admin: 30,
};

export function can(role: string, capability: "read" | "edit" | "manage_admin") {
  const normalized = (role in RANK ? role : "viewer") as AdminRole;
  if (capability === "read") return RANK[normalized] >= RANK.viewer;
  if (capability === "edit") return RANK[normalized] >= RANK.operator;
  return RANK[normalized] >= RANK.admin;
}

export function assertCapability(role: string, capability: "read" | "edit" | "manage_admin") {
  if (!can(role, capability)) {
    throw new Response("Forbidden", { status: 403 });
  }
}
