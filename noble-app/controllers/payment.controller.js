const responses = require("../models/responses");
const paymentService = require("../services/payment.service");
const { paymentCreateSchema } = require("../models/validation");

const listByInvoice = (req, res) => {
  const invoiceId = Number(req.params.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid invoice id"));
  }

  paymentService
    .listByInvoiceId(invoiceId)
    .then((items) => res.status(200).json(new responses.ItemsResponse(items)))
    .catch((err) => {
      console.error("payment list error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const create = (req, res) => {
  const { error, value } = paymentCreateSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  paymentService
    .create(value)
    .then((row) => res.status(201).json(new responses.ItemResponse(row)))
    .catch((err) => {
      if (err.code === "NOT_FOUND") {
        return res.status(404).json(new responses.ErrorResponse(err.message));
      }
      console.error("payment create error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const remove = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid payment id"));
  }

  paymentService
    .deleteById(id)
    .then((result) => res.status(200).json(new responses.ItemResponse(result)))
    .catch((err) => {
      if (err.code === "NOT_FOUND") {
        return res.status(404).json(new responses.ErrorResponse(err.message));
      }
      console.error("payment delete error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { listByInvoice, create, remove };
