const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 login attempts per window
  message: { error: "Too many login attempts, please try again later." },
});

module.exports = router;

router.post("/login", loginRateLimit, authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticateToken, authController.me);
