import { Request, Response, RequestHandler } from "express";
import { AuthService } from "../services/auth-service";
import { db } from "../db";
import { usersTable } from "../db/schema";
import bcrypt from "bcrypt";
import { or, eq } from "drizzle-orm";

export const authController = {
  signup: (async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ status: "error", message: "All fields are required" });
      }

      //check if user exists
      const existingUser = await db.query.usersTable.findFirst({
        where: or(
          eq(usersTable.email, email),
          eq(usersTable.username, username)
        ),
      });

      if (existingUser) {
        return res
          .status(409)
          .json({ status: "error", message: "User already exists" });
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
        status: "success",
        message: "User registered successfully",
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            role: newUser.role,
            createdAt: newUser.createdAt,
          },
        },
        token,
      });
    } catch (error) {
      console.error("Signup Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Something went wrong during signup",
      });
    }
  }) as RequestHandler,

  login: (async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({
          status: "error",
          message: "Identifier(email or username) and password required",
        });
      }

      const token = await AuthService.login(identifier, password);

      if (!token) {
        return res
          .status(401)
          .json({ status: "error", message: "Invalid credentials" });
      }

      const user = await AuthService.getUserFromToken(token);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600000, // 1 hour
      });

      res.json({
        status: "success",
        message: "Login successful",
        data: {
          user: {
            id: user?.id,
            email: user?.email,
            username: user?.username,
            role: user?.role,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Something went wrong during login",
      });
    }
  }) as RequestHandler,

  logout: (async (_: Request, res: Response) => {
    try {
      res.clearCookie("token");
      res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Something went wrong during logout",
      });
    }
  }) as RequestHandler,

  //get user profile (mini)
  me: (async (req: Request, res: Response) => {
    try {
      res.status(200).json({
        status: "success",
        message: "User fetched successfully",
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      console.error("Me Route Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch user",
      });
    }
  }) as RequestHandler,
};
