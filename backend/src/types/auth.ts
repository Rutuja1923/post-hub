export const UserRoles = ["user", "admin"] as const;
export type UserRole = (typeof UserRoles)[number];

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended" | "deleted";
  createdAt: Date;
}
