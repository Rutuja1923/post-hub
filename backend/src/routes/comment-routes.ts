import express, { Request, Response, NextFunction } from "express";
import { commentController } from "../controllers/comment-controller";
import { checkForAuthentication, restrictTo } from "../middleware/auth";

const router = express.Router();

//apply authentication middleware to all comment routes
router.use(checkForAuthentication);

//add a comment to a post
router.post(
  "/",
  restrictTo(["user", "admin"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const result = await commentController.addComment(
        req.user.id,
        req.body.postId,
        req.body.content
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//get comments for a post
router.get(
  "/post/:postId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await commentController.getCommentsByPostId(
        req.params.postId,
        {
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          offset: req.query.offset ? Number(req.query.offset) : undefined,
          includeUserDetails: req.query.includeUserDetails === "true",
        }
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//update a comment
router.patch(
  "/:commentId",
  restrictTo(["user", "admin"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const isAdmin = req.user.role === "admin";
      const result = await commentController.updateComment(
        Number(req.params.commentId),
        req.user.id,
        req.body.content,
        isAdmin
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//delete a comment
router.delete(
  "/:commentId",
  restrictTo(["user", "admin"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const isAdmin = req.user.role === "admin";
      const result = await commentController.deleteComment(
        Number(req.params.commentId),
        req.user.id,
        isAdmin
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

//get comments by user ID
router.get(
  "/user/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await commentController.getCommentsByUserId(
        req.params.userId,
        {
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          offset: req.query.offset ? Number(req.query.offset) : undefined,
        }
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  }
);

export const commentRoutes = router;
