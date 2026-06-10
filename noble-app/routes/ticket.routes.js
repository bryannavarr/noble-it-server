const router = require("express").Router();
const ticketController = require("../controllers/ticket.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All ticket routes require a valid admin session.
router.use(authenticateToken);

router.get("/", ticketController.list);

module.exports = router;
