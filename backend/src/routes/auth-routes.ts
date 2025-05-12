import express from "express";
import { authController } from "../controllers/auth-controller";
import { checkForAuthentication } from "../middleware/auth";

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);

//protected route - logout
router.post("/logout", checkForAuthentication, authController.logout);

router.get("/me", checkForAuthentication, (req, res) => {
  res.json({ user: req.user });
});

export default router;
