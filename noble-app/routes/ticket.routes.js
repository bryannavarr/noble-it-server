const router = require("express").Router();
const ticketController = require("../controllers/ticket.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All ticket routes require a valid admin session.
router.use(authenticateToken);

router.get("/", ticketController.list);
router.post("/", ticketController.create);
// Bulk archive/unarchive must come BEFORE :id so express doesn't try to
// route "bulk-archive" as a ticket id lookup.
router.patch("/bulk-archive", ticketController.bulkArchive);
router.get("/:id", ticketController.get);
router.patch("/:id", ticketController.update);
router.patch("/:id/archive", ticketController.setArchived);

module.exports = router;
