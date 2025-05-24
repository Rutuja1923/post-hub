import { db } from "src/db";
import { usersTable } from "src/db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import "dotenv/config";

async function insertAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME;
    const plainPassword = process.env.ADMIN_PASSWORD;
    const adminRole = "admin";

    if (!adminEmail || !adminUsername || !plainPassword) {
      console.error(
        "Missing ADMIN_EMAIL, ADMIN_USERNAME, or ADMIN_PASSWORD in .env file."
      );
      process.exit(1);
    }

    //check if admin exists
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, adminRole))
      .limit(1);

    if (existing.length > 0) {
      console.log("Admin already exists. Skipping insertion.");
      process.exit(0);
    }

    //hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    //insert admin
    await db.insert(usersTable).values({
      username: adminUsername,
      email: adminEmail,
      hashedPassword,
      role: adminRole as any,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Admin inserted successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to insert admin:", err);
    process.exit(1);
  }
}

insertAdmin();
