const router = require("express").Router();
const onDemandSupportController = require("../controllers/on-demand-support.controller");

module.exports = router;

router.post("/", onDemandSupportController.create);
