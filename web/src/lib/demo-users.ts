import seedUsers from "@/content/seed/users.json";

export type Role = "ADMIN" | "EXECUTIVE" | "MANAGER";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  title?: string;
};

function titleFor(role: Role, department?: string) {
  if (role === "ADMIN") return "System Administrator";
  if (role === "EXECUTIVE") return "Group Executive";
  if (role === "MANAGER") return department ? `Head of ${department}` : "Department Manager";
  return "Contributor";
}

export const demoUsers: DemoUser[] = [
  ...seedUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    department: user.department,
    title: titleFor(user.role as Role, user.department),
  })),
];

export function getDemoUserById(userId: string | undefined | null) {
  if (!userId) return null;
  return demoUsers.find((user) => user.id === userId) ?? null;
}

export function isAdmin(user: DemoUser | null | undefined) {
  return user?.role === "ADMIN";
}
