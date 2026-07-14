const responses = require("../models/responses");
const paymentLinkService = require("../services/payment-link.service");
const stripeService = require("../services/stripe.service");
const { paymentLinkCreateSchema } = require("../models/validation");

// GET /status → { enabled: true|false }. Lets the frontend show a
// "Stripe not configured" banner instead of firing a request that 503s.
const status = (_req, res) => {
  res.status(200).json(new responses.ItemResponse({ enabled: stripeService.isEnabled() }));
};

// POST / → creates a Stripe Checkout session and returns { url }.
const create = (req, res) => {
  const { error, value } = paymentLinkCreateSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  paymentLinkService
    .createCheckoutLink(value)
    .then((result) => res.status(201).json(new responses.ItemResponse(result)))
    .catch((err) => {
      if (err.code === "NOT_CONFIGURED") {
        return res.status(503).json(new responses.ErrorResponse(err.message));
      }
      console.error("payment-link create error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { status, create };
