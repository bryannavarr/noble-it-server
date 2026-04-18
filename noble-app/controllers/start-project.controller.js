const responses = require("../models/responses");
const startProjectService = require("../services/start-project.service");
const { startProjectSchema } = require("../models/validation");

const create = (req, res) => {
  const { error, value } = startProjectSchema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json(new responses.ErrorResponse(error.details[0].message));
  }

  startProjectService
    .create(value)
    .then((response) => {
      res.status(201).json(new responses.SuccessResponse(response));
    })
    .catch((err) => {
      console.error("start-project controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { create };
