const responses = require("../models/responses");
const onDemandSupportService = require("../services/on-demand-support.service");
const { onDemandSupportSchema } = require("../models/validation");

const create = (req, res) => {
  const { error, value } = onDemandSupportSchema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json(new responses.ErrorResponse(error.details[0].message));
  }

  onDemandSupportService
    .create(value)
    .then((response) => {
      res.status(201).json(new responses.SuccessResponse(response));
    })
    .catch((err) => {
      console.error("on-demand-support controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { create };
