import * as jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import { db } from "src/db";
import { usersTable } from "src/db/schema";

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing JWT_SECRET_KEY in environment variables");
  }
  return secret;
};

export const AuthService = {
  async login(identifier: string, password: string): Promise<string | null> {
    const user = await db.query.usersTable.findFirst({
      where: or(
        eq(usersTable.email, identifier),
        eq(usersTable.username, identifier)
      ),
    });

    if (!user || user.status === "deleted") return null;

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) return null;

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      getJwtSecret(),
      { expiresIn: "1h" }
    );
  },

  async verifyToken(token: string | undefined): Promise<any | null> {
    if (!token) return null;

    try {
      return jwt.verify(token, getJwtSecret());
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  },

  async getUserFromToken(token: string | undefined) {
    if (!token) return null;

    const decoded = await this.verifyToken(token);
    if (!decoded) return null;

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, decoded.id),
      columns: {
        hashedPassword: false,
      },
    });

    return user;
  },
};
