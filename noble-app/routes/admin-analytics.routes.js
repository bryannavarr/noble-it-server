const router = require("express").Router();
const controller = require("../controllers/analytics.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/cash-flow", controller.cashFlow);
router.get("/top-clients", controller.topClients);
router.get("/new-clients", controller.newClients);
router.get("/invoices-this-month", controller.invoicesThisMonth);
router.get("/ticket-backlog", controller.ticketBacklog);

module.exports = router;
