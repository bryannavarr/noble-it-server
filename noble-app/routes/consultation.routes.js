const router = require("express").Router();
const consultationController = require("../controllers/consultation.controller");

module.exports = router;

router.post("/", consultationController.create);
