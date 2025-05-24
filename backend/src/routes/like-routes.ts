import express, { Request, Response, NextFunction } from "express";
import { likeController } from "../controllers/like-controller";
import { checkForAuthentication, restrictTo } from "../middleware/auth";
import { AuthenticatedUser } from "../types/auth";

const router = express.Router();

//apply authentication middleware to all like routes
router.use(checkForAuthentication);

//like a post
router.post(
  "/",
  restrictTo(["user", "admin"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const result = await likeController.likePost(
        req.user as AuthenticatedUser,
        { postId: req.body.postId }
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//unlike a post
router.delete(
  "/",
  restrictTo(["user", "admin"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const result = await likeController.unlikePost(
        req.user as AuthenticatedUser,
        { postId: req.body.postId }
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//check if current user liked a post
router.get(
  "/check/:postId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const result = await likeController.hasUserLikedPost(
        req.user as AuthenticatedUser,
        req.params.postId
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//get likes by current user
router.get(
  "/my-likes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const { limit, offset, includePostDetails } = req.query;
      const result = await likeController.getLikesByUser(
        req.user as AuthenticatedUser,
        {
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
          includePostDetails: includePostDetails === "true",
        }
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//get likes for a specific post (public endpoint)
router.get(
  "/post/:postId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeUserDetails = req.query.includeUserDetails === "true";
      const result = await likeController.getLikesByPostId(req.params.postId, {
        includeUserDetails,
      });
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//get like count for a post (public endpoint)
router.get(
  "/count/:postId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await likeController.getLikeCount(req.params.postId);
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

export const likeRoutes = router;
