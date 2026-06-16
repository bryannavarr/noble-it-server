// Admin endpoints for invoice resources that aren't scoped to a client.
// (Client-scoped listing lives in admin-client.routes.js at
// GET /:clientId/invoices.)
const router = require("express").Router();
const invoiceController = require("../controllers/invoice.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/:id/view-url", invoiceController.getViewUrl);

module.exports = router;
