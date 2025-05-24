import express from "express";
import { postController } from "../controllers/post-controller";
import { checkForAuthentication, restrictTo } from "../middleware/auth";
import { AuthenticatedUser } from "src/types/auth";

const router = express.Router();

//public: get all posts
router.get("/", async (req, res) => {
  try {
    const options = {
      categoryId: req.query.categoryId
        ? Number(req.query.categoryId)
        : undefined,
      userId: req.query.userId as string | undefined,
      publishedOnly: req.query.publishedOnly === "true",
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      includeUnpublishedForOwner: req.query.includeUnpublishedForOwner as
        | string
        | undefined,
    };

    const result = await postController.getPosts(options);
    res.status(result.statusCode).json(result.body);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//public: get posts by userId or username
router.get("/user", async (req, res) => {
  try {
    const options = {
      userId: req.query.userId as string | undefined,
      username: req.query.username as string | undefined,
      publishedOnly: req.query.publishedOnly === "true",
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      includeUnpublishedForOwner: req.query.includeUnpublishedForOwner as
        | string
        | undefined,
    };

    const result = await postController.getPostsByUser(options);
    res.status(result.statusCode).json(result.body);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//protected: get post by ID or slug
router.get("/:identifier", checkForAuthentication, async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const requestingUserId = req.user?.id;

    const result = await postController.getPostByIdOrSlug(
      identifier,
      requestingUserId
    );
    res.status(result.statusCode).json(result.body);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

//protected: create post
router.post(
  "/",
  checkForAuthentication,
  restrictTo(["user", "admin"]),
  async (req, res): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const result = await postController.createPost(
        req.user as AuthenticatedUser,
        req.body
      );

      res.status(result.statusCode).json(result.body);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
);

//protected: update post
router.patch(
  "/:id",
  checkForAuthentication,
  restrictTo(["user"]),
  async (req, res): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const result = await postController.updatePost(
        req.params.id,
        req.user.id,
        req.body
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
);

//protected: Delete post
router.delete(
  "/:id",
  checkForAuthentication,
  restrictTo(["user"]),
  async (req, res): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ status: "error", message: "Unauthorized" });
        return;
      }

      const result = await postController.deletePost(
        req.params.id,
        req.user.id
      );
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
);

export const postRoutes = router;
