const responses = require("../models/responses");
const analytics = require("../services/analytics.service");

const wrap = (fn, errLabel) => (req, res) => {
  fn(req)
    .then((data) => res.status(200).json(new responses.ItemResponse(data)))
    .catch((err) => {
      console.error(`${errLabel} error:`, err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const cashFlow = wrap((req) => {
  const range = req.query.range === "year" ? "year" : "month";
  return analytics.cashFlow(range);
}, "analytics cash-flow");

const topClients = wrap((req) => analytics.topClients(req.query.limit), "analytics top-clients");
const newClients = wrap(() => analytics.newClientsThisMonth(), "analytics new-clients");
const invoicesThisMonth = wrap(() => analytics.invoicesThisMonth(), "analytics invoices");
const ticketBacklog = wrap(() => analytics.ticketBacklog(), "analytics ticket-backlog");

// Uses ItemsResponse (not ItemResponse) since the payload is a plain array of
// payment rows — the frontend can iterate `items` directly.
const paymentsInRange = (req, res) => {
  const range = req.query.range === "year" ? "year" : "month";
  analytics
    .paymentsInRange(range)
    .then((items) => res.status(200).json(new responses.ItemsResponse(items)))
    .catch((err) => {
      console.error("analytics payments-list error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = {
  cashFlow,
  topClients,
  newClients,
  invoicesThisMonth,
  ticketBacklog,
  paymentsInRange,
};
