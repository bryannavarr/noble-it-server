const router = require("express").Router();
const adminLinkController = require("../controllers/admin-link.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/", adminLinkController.list);
router.post("/", adminLinkController.create);
router.patch("/:id", adminLinkController.update);
router.delete("/:id", adminLinkController.remove);

module.exports = router;
