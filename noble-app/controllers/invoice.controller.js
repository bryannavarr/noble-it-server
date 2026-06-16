const responses = require("../models/responses");
const invoiceService = require("../services/invoice.service");
const s3Service = require("../services/s3.service");
const { invoiceListSchema } = require("../models/validation");

const list = (req, res) => {
  const { error, value } = invoiceListSchema.validate(req.query, {
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json(new responses.ErrorResponse(error.details[0].message));
  }

  invoiceService
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
      console.error("invoice controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

const listByClient = (req, res) => {
  const clientId = Number(req.params.clientId);
  if (!Number.isInteger(clientId) || clientId < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid client id"));
  }

  invoiceService
    .listByClientId(clientId)
    .then((items) => {
      res.status(200).json(new responses.ItemsResponse(items));
    })
    .catch((err) => {
      console.error("invoice controller error:", err.message);
      res.status(500).json(new responses.ErrorResponse("Something went wrong"));
    });
};

// Returns a short-lived signed S3 URL the browser can use to view/download
// the PDF. 404s if the invoice isn't in the cloud yet; 503s if S3 isn't
// configured on this server.
const getViewUrl = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid invoice id"));
  }

  try {
    const invoice = await invoiceService.findById(id);
    if (!invoice) {
      return res.status(404).json(new responses.ErrorResponse("Invoice not found"));
    }
    if (!invoice.is_in_cloud) {
      return res
        .status(404)
        .json(new responses.ErrorResponse("Invoice has not been archived to S3"));
    }
    if (!s3Service.isEnabled()) {
      return res
        .status(503)
        .json(new responses.ErrorResponse("S3 is not configured on this server"));
    }

    const url = await s3Service.getSignedViewUrl(invoice.pdf_path, 300);
    res.status(200).json(new responses.ItemResponse({ url, expires_in: 300 }));
  } catch (err) {
    console.error("invoice view-url error:", err.message);
    res.status(500).json(new responses.ErrorResponse("Something went wrong"));
  }
};

module.exports = { list, listByClient, getViewUrl };
