import express from "express";
import { authController } from "../controllers/auth-controller";
import { checkForAuthentication } from "../middleware/auth";

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

//protected route - logout
router.post("/logout", checkForAuthentication, authController.logout);

//get profile
router.get("/me", checkForAuthentication, authController.me);

export const authRoutes = router;
