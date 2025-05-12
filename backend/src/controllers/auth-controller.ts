import { Request, Response, RequestHandler } from "express";
import { AuthService } from "../services/auth-service";
import { db } from "../db";
import { usersTable } from "../db/schema";
import bcrypt from "bcrypt";
import { or, eq } from "drizzle-orm";

export const authController = {
  signup: (async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    //check if user exists
    const existingUser = await db.query.usersTable.findFirst({
      where: or(eq(usersTable.email, email), eq(usersTable.username, username)),
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        hashedPassword,
        role: "user",
        status: "active",
      })
      .returning();

    const token = await AuthService.login(email, password);

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
      token,
    });
  }) as RequestHandler,

  login: (async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Identifier(email or username) and password required",
      });
    }

    const token = await AuthService.login(identifier, password);

    if (!token) {
      return res
        .status(401)
        .json({ status: "Error", message: "Invalid credentials" });
    }

    const user = await AuthService.getUserFromToken(token);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000, // 1 hour
    });

    res.json({
      user: {
        id: user?.id,
        email: user?.email,
        username: user?.username,
        role: user?.role,
      },
      token,
    });
  }) as RequestHandler,

  logout: (async (_: Request, res: Response) => {
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  }) as RequestHandler,
};
