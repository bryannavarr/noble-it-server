const Joi = require("joi");

const contactUsSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  message: Joi.string().trim().max(2000).required(),
});

const onDemandSupportSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().max(20).optional().allow(""),
  company: Joi.string().trim().max(100).optional().allow(""),
  message: Joi.string().trim().max(2000).required(),
});

const startProjectSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().required(),
  company: Joi.string().trim().max(100).optional().allow(""),
  message: Joi.string().trim().max(2000).required(),
  architecture: Joi.array().items(Joi.string().trim()).optional(),
});

const consultationSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().max(20).optional().allow(""),
  company: Joi.string().trim().max(100).optional().allow(""),
  source: Joi.string().trim().optional().allow(""),
});

const adminLoginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().max(200).required(),
});

// Keep this list in sync with SORT_COLUMN_SQL in services/ticket.service.js.
const TICKET_SORT_COLUMNS = [
  "ticket_number",
  "subject",
  "client_name",
  "category",
  "priority",
  "status",
  "created_at",
];

const ticketListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().max(200).allow("").default(""),
  sort: Joi.string()
    .valid(...TICKET_SORT_COLUMNS)
    .default("created_at"),
  sortDir: Joi.string().lowercase().valid("asc", "desc").default("desc"),
});

// Keep this list in sync with SORT_COLUMN_SQL in services/client.service.js.
const CLIENT_SORT_COLUMNS = [
  "name",
  "contact_name",
  "email",
  "phone",
  "default_rate",
  "created_at",
];

const clientListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().max(200).allow("").default(""),
  sort: Joi.string()
    .valid(...CLIENT_SORT_COLUMNS)
    .default("created_at"),
  sortDir: Joi.string().lowercase().valid("asc", "desc").default("desc"),
});

// Accepts a comma-separated string of emails. Validates each address and
// returns the normalized "a@x.com, b@x.com" form.
const multiEmailField = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const list = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) {
      return helpers.error("any.invalid", { message: "at least one email is required" });
    }
    for (const e of list) {
      const { error } = Joi.string().email().validate(e);
      if (error) return helpers.error("string.email", { value: e });
    }
    return list.join(", ");
  });

// Keep this list in sync with SORT_COLUMN_SQL in services/invoice.service.js.
const INVOICE_SORT_COLUMNS = [
  "invoice_number",
  "client_name",
  "invoice_date",
  "due_date",
  "total_amount",
  "status",
];

const invoiceListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().max(200).allow("").default(""),
  sort: Joi.string()
    .valid(...INVOICE_SORT_COLUMNS)
    .default("invoice_date"),
  sortDir: Joi.string().lowercase().valid("asc", "desc").default("desc"),
});

// Keep the method list in sync with the payments.method ENUM in the SQL
// migration. Anything outside the list is rejected here before we ever try
// to write it.
const PAYMENT_METHODS = [
  "ACH",
  "CASH",
  "ZELLE",
  "PAYPAL",
  "VENMO",
  "CHECK",
  "CREDIT_CARD",
  "OTHER",
];

const paymentCreateSchema = Joi.object({
  invoice_id: Joi.number().integer().min(1).required(),
  amount: Joi.number().min(0.01).max(99999999.99).required(),
  method: Joi.string()
    .uppercase()
    .valid(...PAYMENT_METHODS)
    .required(),
  paid_date: Joi.date().iso().required(),
  reference_number: Joi.string().trim().max(100).allow("", null),
  notes: Joi.string().trim().max(2000).allow("", null),
});

// All fields optional so the PATCH can be partial — the controller rejects an
// empty payload.
const clientUpdateSchema = Joi.object({
  name: Joi.string().trim().max(255),
  contact_name: Joi.string().trim().max(255).allow("", null),
  email: multiEmailField,
  phone: Joi.string().trim().max(50).allow("", null),
  website: Joi.string().trim().max(255).allow("", null),
  default_rate: Joi.number().min(0).max(9999999.99),
  source: Joi.string().trim().max(100).allow("", null),
  acquired_at: Joi.date().iso().allow(null),
  last_serviced_at: Joi.date().iso().allow(null),
  under_contract: Joi.boolean(),
  has_reviewed: Joi.boolean(),
}).min(1);

module.exports = {
  contactUsSchema,
  onDemandSupportSchema,
  startProjectSchema,
  consultationSchema,
  adminLoginSchema,
  ticketListSchema,
  clientListSchema,
  clientUpdateSchema,
  invoiceListSchema,
  paymentCreateSchema,
  PAYMENT_METHODS,
};
