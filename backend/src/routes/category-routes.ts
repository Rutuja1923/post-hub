import express, { Request, Response } from "express";
import { categoryController } from "../controllers/category-controller";
import { checkForAuthentication, restrictTo } from "../middleware/auth";

const router = express.Router();

router.post(
  "/",
  checkForAuthentication,
  restrictTo(["admin"]),
  async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const adminId = req.user!.id;

    const result = await categoryController.createCategory(
      adminId,
      name,
      description
    );
    res.status(result.statusCode).json(result.body);
  }
);

router.get("/", async (req: Request, res: Response) => {
  const result = await categoryController.getAllCategories();
  res.status(result.statusCode).json(result.body);
});

router.get("/:slug", async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await categoryController.getCategoryBySlug(slug);
  res.status(result.statusCode).json(result.body);
});

router.patch(
  "/:id",
  checkForAuthentication,
  restrictTo(["admin"]),
  async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    const { name, description } = req.body;
    const adminId = req.user!.id;

    const result = await categoryController.updateCategory(
      adminId,
      categoryId,
      { name, description }
    );
    res.status(result.statusCode).json(result.body);
  }
);

router.delete(
  "/:id",
  checkForAuthentication,
  restrictTo(["admin"]),
  async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    const adminId = req.user!.id;

    const result = await categoryController.safeDeleteCategory(
      adminId,
      categoryId
    );
    res.status(result.statusCode).json(result.body);
  }
);

export const categoryRoutes = router;
