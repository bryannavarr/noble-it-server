// Admin endpoints for invoice resources that aren't scoped to a client.
// (Client-scoped listing lives in admin-client.routes.js at
// GET /:clientId/invoices.)
const router = require("express").Router();
const invoiceController = require("../controllers/invoice.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/", invoiceController.list);
router.get("/:id/view-url", invoiceController.getViewUrl);

// Editor endpoints — preview + create + append. Proxy to noble-msp-crm's
// selection-based invoice endpoints.
router.post("/preview", invoiceController.previewFromSelection);
router.post("/", invoiceController.createFromSelection);
router.post("/:id/append", invoiceController.appendToInvoice);

module.exports = router;
