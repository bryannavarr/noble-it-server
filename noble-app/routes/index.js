const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const onDemandSupportRoutes = require("./on-demand-support.routes");
const contactUsRoutes = require("./contact-us.routes");
const startProjectRoutes = require("./start-project.routes");
const clientRoutes = require("./client.routes");
const consultationRoutes = require("./consultation.routes");

const formRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 requests per window
  message: { error: "Too many requests, please try again later." },
});

// API routes
router.use("/api/on-demand-support", formRateLimit, onDemandSupportRoutes);
router.use("/api/contact-us", formRateLimit, contactUsRoutes);
router.use("/api/start-project", formRateLimit, startProjectRoutes);
router.use("/api/consultation", formRateLimit, consultationRoutes);

// API error handlers (must be registered before client routes)
useAPIErrorHandlers(router);

// Client routes
router.use(clientRoutes);

function useAPIErrorHandlers(router) {
  router.use("/api/*", (req, res, next) => {
    res.status(404).json({ error: "API route not found" });
  });

  router.use((err, req, res, next) => {
    if (!err) return next();
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  });
}

module.exports = router;
