import { Request, Response, RequestHandler } from "express";
import { db } from "../db";
import { usersTable, userDetailsTable } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { AuthService } from "src/services/auth-service";

export const userController = {
  //get current user profile
  getProfile: (async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    try {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
        with: {
          details: true,
        },
      });

      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      const { hashedPassword, deletedAt, ...userData } = user;
      //on success, return userdata
      return res.status(200).json({
        status: "success",
        message: "User profile fetched successfully",
        data: userData,
      });
    } catch (error) {
      res
        .status(500)
        .json({ status: "error", message: "Failed to fetch user profile" });
    }
  }) as RequestHandler,

  //update user name, email or password
  updateUser: (async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { email, username, currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    try {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      });

      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      //verify current password while changing sensitive fields
      if (email || username || newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            status: "error",
            message: "Current password is required to make these changes",
          });
        }

        const passwordMatch = await bcrypt.compare(
          currentPassword,
          user.hashedPassword
        );

        if (!passwordMatch) {
          return res.status(401).json({
            status: "error",
            message: "Current password is incorrect",
          });
        }
      }

      const updateData: {
        email?: string;
        username?: string;
        hashedPassword?: string;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      let newToken: string | null = null;
      let requiresTokenRefresh = false;

      //handle email update
      if (email && email !== user.email) {
        const emailExists = await db.query.usersTable.findFirst({
          where: eq(usersTable.email, email),
        });

        if (emailExists) {
          return res
            .status(409)
            .json({ status: "error", message: "Email already in use" });
        }
        updateData.email = email;
        requiresTokenRefresh = true;
      }

      //handle username update
      if (username && username !== user.username) {
        const usernameExists = await db.query.usersTable.findFirst({
          where: eq(usersTable.username, username),
        });

        if (usernameExists) {
          return res
            .status(409)
            .json({ status: "error", message: "Username already taken" });
        }
        updateData.username = username;
        requiresTokenRefresh = true;
      }

      //handle password update
      if (newPassword) {
        updateData.hashedPassword = await bcrypt.hash(newPassword, 10);
        requiresTokenRefresh = true;
      }

      //update user data
      const [updatedUser] = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, userId))
        .returning();

      //generate new token when password and email are updates - keep user logged in
      if (requiresTokenRefresh) {
        const identifier = updateData.email || user.email;
        const passwordForAuth = newPassword || currentPassword;

        if (!passwordForAuth) {
          return res.status(400).json({
            status: "error",
            message: "Password required for authentication refresh",
          });
        }

        newToken = await AuthService.login(identifier, passwordForAuth);

        if (!newToken) {
          return res
            .status(500)
            .json({ status: "error", message: "Failed to regenerate token" });
        }
      }

      //set new token in cookie if generated
      res.cookie("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600000, //valid for 1 hour
      });

      const { hashedPassword, ...userData } = updatedUser;

      //send a response on success
      return res.status(200).json({
        status: "success",
        message: "User updated successfully",
        data: {
          user: userData,
          token: newToken || undefined,
        },
      });
    } catch (error) {
      console.error("Update user error:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to update user" });
    }
  }) as RequestHandler,

  //update or add user details
  updateDetails: (async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { fullName, bio, isPublic, location, website } = req.body;

    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    try {
      //check if user exists
      const userExists = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      });

      if (!userExists) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      //check if user details already exist
      const existingDetails = await db.query.userDetailsTable.findFirst({
        where: eq(userDetailsTable.userId, userId),
      });

      const detailsData = {
        fullName,
        bio,
        isPublic,
        location,
        website,
        updatedAt: new Date(),
      };

      let result;
      if (existingDetails) {
        //update existing details
        [result] = await db
          .update(userDetailsTable)
          .set(detailsData)
          .where(eq(userDetailsTable.userId, userId))
          .returning();
      } else {
        //create new details
        [result] = await db
          .insert(userDetailsTable)
          .values({
            userId,
            ...detailsData,
          })
          .returning();
      }

      res.json({
        status: "success",
        message: "User details updated successfully",
        data: result,
      });
    } catch (error) {
      res
        .status(500)
        .json({ status: "error", message: "Failed to update user details" });
    }
  }) as RequestHandler,

  //delete user account (soft delete)
  deleteAccount: (async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    if (!password) {
      return res
        .status(400)
        .json({ status: "error", message: "Password is required" });
    }

    try {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      });

      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found" });
      }

      const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
      if (!passwordMatch) {
        return res
          .status(401)
          .json({ status: "error", message: "Incorrect password" });
      }

      await db
        .update(usersTable)
        .set({
          status: "deleted",
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, userId));

      res.clearCookie("token");
      res.json({status: "success", message: "Account deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  }) as RequestHandler,

};
