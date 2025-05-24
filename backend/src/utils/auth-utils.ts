import { db } from "src/db";
import { usersTable } from "src/db/schema";
import { and, eq } from "drizzle-orm";

export async function verifyAdmin(userId: string) {
  const admin = await db.query.usersTable.findFirst({
    where: and(
      eq(usersTable.id, userId),
      eq(usersTable.role, "admin"),
      eq(usersTable.status, "active")
    ),
    columns: { id: true },
  });

  if (!admin) {
    throw new Error("Unauthorized: Admin privileges required");
  }
  return true;
}
