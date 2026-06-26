// Admin payment endpoints. List-by-invoice is mounted under the per-invoice
// route prefix; create + delete are top-level since the invoice_id lives in
// the request body / payment row.
const router = require("express").Router();
const paymentController = require("../controllers/payment.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/by-invoice/:invoiceId", paymentController.listByInvoice);
router.post("/", paymentController.create);
router.delete("/:id", paymentController.remove);

module.exports = router;
