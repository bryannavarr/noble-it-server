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

// ── Editor: preview + generate + append (proxy to noble-msp-crm) ──────────

const crm = require("../services/crm-client.service");

// Handle a CRM error uniformly. The CRM returns { success: false, error }
// on 4xx/5xx; unwrap into our ErrorResponse envelope.
//
// IMPORTANT: translate CRM 401s into 502 upstream errors before returning
// to the admin frontend. The frontend has a global 401 handler that clears
// the local session and redirects to /admin/login — meant for real "user
// session expired" cases. A CRM auth failure is a server-to-server config
// problem (missing/wrong MSP_API_KEY) and has nothing to do with the admin
// user's session, so we must not let it trigger a logout.
const relayCrmError = (res, err, label) => {
  const upstream = err.response?.status || 500;
  const body = err.response?.data;
  const rawMessage = body?.error || err.message || "Something went wrong";
  console.error(`${label} error:`, rawMessage);

  const isUpstreamAuth = upstream === 401 || upstream === 403;
  const status = isUpstreamAuth ? 502 : upstream;
  const message = isUpstreamAuth
    ? "Invoice service auth failed (check MSP_API_KEY on this server)"
    : rawMessage;

  res.status(status).json(new responses.ErrorResponse(message));
};

const previewFromSelection = async (req, res) => {
  const { client_id, ticket_ids, meeting_ids } = req.body || {};
  if (!Number.isInteger(client_id) || client_id < 1) {
    return res.status(400).json(new responses.ErrorResponse("client_id is required"));
  }
  try {
    const r = await crm.previewFromSelection({
      client_id,
      ticket_ids: Array.isArray(ticket_ids) ? ticket_ids : [],
      meeting_ids: Array.isArray(meeting_ids) ? meeting_ids : [],
    });
    // CRM envelope is { success, data }; unwrap into our ItemResponse.
    res.status(200).json(new responses.ItemResponse(r.data));
  } catch (err) {
    relayCrmError(res, err, "preview-from-selection");
  }
};

const createFromSelection = async (req, res) => {
  const { client_id, invoice_date, due_date, notes, line_items } = req.body || {};
  if (!Number.isInteger(client_id) || client_id < 1) {
    return res.status(400).json(new responses.ErrorResponse("client_id is required"));
  }
  if (!Array.isArray(line_items) || line_items.length === 0) {
    return res
      .status(400)
      .json(new responses.ErrorResponse("At least one line item is required"));
  }
  try {
    const r = await crm.generateFromSelection({
      client_id,
      invoice_date,
      due_date,
      notes,
      line_items,
    });
    res.status(201).json(new responses.ItemResponse(r.data));
  } catch (err) {
    relayCrmError(res, err, "generate-from-selection");
  }
};

const appendToInvoice = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid invoice id"));
  }
  const { line_items } = req.body || {};
  if (!Array.isArray(line_items) || line_items.length === 0) {
    return res
      .status(400)
      .json(new responses.ErrorResponse("At least one line item is required"));
  }
  try {
    const r = await crm.appendToInvoice(id, { line_items });
    res.status(200).json(new responses.ItemResponse(r.data));
  } catch (err) {
    relayCrmError(res, err, "append-to-invoice");
  }
};

// ── Approve + payment-link (per-invoice actions) ──────────────────────────

const paymentLinkService = require("../services/payment-link.service");

const approve = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid invoice id"));
  }
  try {
    const row = await invoiceService.approve(id);
    res.status(200).json(new responses.ItemResponse(row));
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json(new responses.ErrorResponse(err.message));
    }
    if (err.code === "INVALID_STATE") {
      return res.status(400).json(new responses.ErrorResponse(err.message));
    }
    console.error("invoice approve error:", err.message);
    res.status(500).json(new responses.ErrorResponse("Something went wrong"));
  }
};

// Generate a Stripe Checkout link for an approved invoice. Reuses the same
// service the Tools tab uses, then stores the URL on the invoice row so the
// admin UI can surface it (and so you can regenerate + still have the
// previous URL replaced atomically).
const generatePaymentLink = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json(new responses.ErrorResponse("Invalid invoice id"));
  }
  try {
    const inv = await invoiceService.findById(id);
    if (!inv) {
      return res.status(404).json(new responses.ErrorResponse("Invoice not found"));
    }
    // Per product spec: payment link is only available after approval. This
    // guard makes the constraint explicit at the API layer so no frontend
    // bug can slip through and mint a link for an unapproved draft.
    if (!["APPROVED", "SENT", "PAID"].includes(inv.status)) {
      return res
        .status(400)
        .json(
          new responses.ErrorResponse(
            "Invoice must be approved before generating a payment link",
          ),
        );
    }

    const amount = Number(inv.total_amount);
    if (!(amount > 0)) {
      return res
        .status(400)
        .json(new responses.ErrorResponse("Invoice total must be greater than $0"));
    }

    // Pull the client name for the Stripe checkout description — helps the
    // customer see WHY they're being charged in the Stripe UI.
    const [[client]] = await require("../db/pool").query(
      `SELECT name FROM clients WHERE id = ?`,
      [inv.client_id],
    );
    const description = client
      ? `Invoice ${inv.invoice_number} — ${client.name}`
      : `Invoice ${inv.invoice_number}`;

    const result = await paymentLinkService.createCheckoutLink({
      amount,
      description,
      client_id: inv.client_id,
      invoice_id: inv.id,
    });

    const updated = await invoiceService.setStripeUrl(id, result.url);
    res.status(200).json(new responses.ItemResponse(updated));
  } catch (err) {
    if (err.code === "NOT_CONFIGURED") {
      return res.status(503).json(new responses.ErrorResponse(err.message));
    }
    console.error("invoice payment-link error:", err.message);
    res.status(500).json(new responses.ErrorResponse("Something went wrong"));
  }
};

module.exports = {
  list,
  listByClient,
  getViewUrl,
  previewFromSelection,
  createFromSelection,
  appendToInvoice,
  approve,
  generatePaymentLink,
};
