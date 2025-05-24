import express from "express";
import { checkForAuthentication } from "src/middleware/auth";
import { userController } from "../controllers/user-controller";

const router = express.Router();

// Protect all user routes
router.use(checkForAuthentication);

router.get("/me", userController.getProfile);
router.patch("/me", userController.updateUser);
router.patch("/me/details", userController.updateDetails);
router.delete("/me", userController.deleteAccount);

export const userRoutes = router;
