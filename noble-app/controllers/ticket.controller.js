const responses = require("../models/responses");
const ticketService = require("../services/ticket.service");
const { ticketListSchema } = require("../models/validation");

const list = (req, res) => {
  const { error, value } = ticketListSchema.validate(req.query, {
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res
      .status(400)
      .json(new responses.ErrorResponse(error.details[0].message));
  }

  ticketService
    .listPaginated(value)
    .then(({ items, total }) => {
      const response = new responses.ItemsResponse(items);
      response.meta = {
        page: value.page,
        pageSize: value.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / value.pageSize)),
      };
      res.status(200).json(response);
    })
    .catch((err) => {
      console.error("ticket controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { list };
