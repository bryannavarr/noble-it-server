const responses = require("../models/responses");
const ticketService = require("../services/ticket.service");
const {
  ticketListSchema,
  ticketCreateSchema,
  ticketUpdateSchema,
  ticketBulkArchiveSchema,
} = require("../models/validation");

const list = (req, res) => {
  const { error, value } = ticketListSchema.validate(req.query, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
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
      console.error("ticket list error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const get = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid ticket id"));
  }
  ticketService
    .findById(id)
    .then((row) => {
      if (!row) return res.status(404).json(new responses.ErrorResponse("Ticket not found"));
      res.status(200).json(new responses.ItemResponse(row));
    })
    .catch((err) => {
      console.error("ticket get error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const create = (req, res) => {
  const { error, value } = ticketCreateSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }
  ticketService
    .create(value)
    .then((row) => res.status(201).json(new responses.ItemResponse(row)))
    .catch((err) => {
      if (err.code === "NOT_FOUND") {
        return res.status(404).json(new responses.ErrorResponse(err.message));
      }
      console.error("ticket create error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const update = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid ticket id"));
  }
  const { error, value } = ticketUpdateSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }
  ticketService
    .updateById(id, value)
    .then((row) => {
      if (!row) return res.status(404).json(new responses.ErrorResponse("Ticket not found"));
      res.status(200).json(new responses.ItemResponse(row));
    })
    .catch((err) => {
      console.error("ticket update error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

// PATCH /:id/archive with { archived: true|false } — treats archive and
// unarchive symmetrically instead of two endpoints.
const setArchived = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid ticket id"));
  }
  const archived = req.body?.archived === true;
  ticketService
    .setArchived(id, archived)
    .then((row) => {
      if (!row) return res.status(404).json(new responses.ErrorResponse("Ticket not found"));
      res.status(200).json(new responses.ItemResponse(row));
    })
    .catch((err) => {
      console.error("ticket archive error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const bulkArchive = (req, res) => {
  const { error, value } = ticketBulkArchiveSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }
  ticketService
    .bulkSetArchived(value.ids, value.archived)
    .then((affected) =>
      res.status(200).json(new responses.ItemResponse({ affected })),
    )
    .catch((err) => {
      console.error("ticket bulk-archive error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { list, get, create, update, setArchived, bulkArchive };
