const router = require("express").Router();
const contactUsController = require("../controllers/contact-us.controller");

module.exports = router;

router.post("/", contactUsController.create);
