const responses = require("../models/responses");
const contactUsService = require("../services/contact-us.service");
const { contactUsSchema } = require("../models/validation");

const create = (req, res) => {
  const { error, value } = contactUsSchema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json(new responses.ErrorResponse(error.details[0].message));
  }

  contactUsService
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
