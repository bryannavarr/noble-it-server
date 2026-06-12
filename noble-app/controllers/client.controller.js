const responses = require("../models/responses");
const clientService = require("../services/client.service");
const { clientListSchema, clientUpdateSchema } = require("../models/validation");

const list = (req, res) => {
  const { error, value } = clientListSchema.validate(req.query, {
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  clientService
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
      console.error("client controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const update = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid client id"));
  }

  const { error, value } = clientUpdateSchema.validate(req.body, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  try {
    const affected = await clientService.updateById(id, value);
    if (affected === 0) {
      // Either the id didn't exist or no real changes — disambiguate by
      // checking existence so we don't return 404 on a no-op update.
      const existing = await clientService.findById(id);
      if (!existing) {
        return res.status(404).json(new responses.ErrorResponse("Client not found"));
      }
      return res.status(200).json(new responses.ItemResponse(existing));
    }
    const fresh = await clientService.findById(id);
    res.status(200).json(new responses.ItemResponse(fresh));
  } catch (err) {
    console.error("client update error:", err.message);
    res.status(500).json(new responses.ErrorResponse("Something went wrong"));
  }
};

module.exports = { list, update };
