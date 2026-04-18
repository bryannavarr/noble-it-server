const router = require("express").Router();
const startProjectController = require("../controllers/start-project.controller");

router.post("/", startProjectController.create);

module.exports = router;
