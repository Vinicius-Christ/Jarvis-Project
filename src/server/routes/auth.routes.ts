import { Router } from "express";
import { login } from "../controllers/auth.controller";
import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
});

router.post("/login", loginLimiter, login);

export default router;
