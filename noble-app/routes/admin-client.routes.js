// Admin endpoint for client management.
// Named with the "admin-" prefix to avoid colliding with client.routes.js,
// which serves the SPA via the catch-all at the bottom of routes/index.js.
const router = require("express").Router();
const clientController = require("../controllers/client.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All admin-client routes require a valid admin session.
router.use(authenticateToken);

router.get("/", clientController.list);

module.exports = router;
