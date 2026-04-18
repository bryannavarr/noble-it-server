const responses = require("../models/responses");
const consultationService = require("../services/consultation.service");
const { consultationSchema } = require("../models/validation");

const create = (req, res) => {
  const { error, value } = consultationSchema.validate(req.body);

  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  consultationService
    .create(value)
    .then((response) => {
      res.status(201).json(new responses.SuccessResponse(response));
    })
    .catch((err) => {
      console.error("contact-us controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { create };
