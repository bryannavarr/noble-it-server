const router = require("express").Router();
const paymentLinkController = require("../controllers/payment-link.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/status", paymentLinkController.status);
router.post("/", paymentLinkController.create);

module.exports = router;
