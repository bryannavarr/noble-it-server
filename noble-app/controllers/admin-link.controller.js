const responses = require("../models/responses");
const adminLinkService = require("../services/admin-link.service");
const {
  adminLinkCreateSchema,
  adminLinkUpdateSchema,
} = require("../models/validation");

const list = (_req, res) => {
  adminLinkService
    .list()
    .then((items) => res.status(200).json(new responses.ItemsResponse(items)))
    .catch((err) => {
      console.error("admin-link list error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const create = (req, res) => {
  const { error, value } = adminLinkCreateSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  adminLinkService
    .create(value)
    .then((row) => res.status(201).json(new responses.ItemResponse(row)))
    .catch((err) => {
      console.error("admin-link create error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const update = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid link id"));
  }

  const { error, value } = adminLinkUpdateSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  adminLinkService
    .updateById(id, value)
    .then((row) => {
      if (!row) {
        return res.status(404).json(new responses.ErrorResponse("Link not found"));
      }
      res.status(200).json(new responses.ItemResponse(row));
    })
    .catch((err) => {
      console.error("admin-link update error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const remove = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid link id"));
  }

  adminLinkService
    .deleteById(id)
    .then((ok) => {
      if (!ok) return res.status(404).json(new responses.ErrorResponse("Link not found"));
      res.status(200).json(new responses.ItemResponse({ id }));
    })
    .catch((err) => {
      console.error("admin-link delete error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

module.exports = { list, create, update, remove };
