// Thin HTTP client for talking to noble-msp-crm from noble-it-server.
// Both run on the same EC2 box; the admin backend forwards editor requests
// to the CRM's invoice endpoints so we don't duplicate PDF generation.
//
// Base URL comes from MSP_API_URL_INTERNAL (default: http://localhost:3100),
// so prod hits the same-host CRM without traversing the public nginx.

const axios = require("axios");

const baseURL = process.env.MSP_API_URL_INTERNAL || "http://localhost:3100";

const client = axios.create({
  baseURL,
  timeout: 30000, // PDF generation + S3 upload can take a moment
  headers: { "Content-Type": "application/json" },
});

const previewFromSelection = (payload) =>
  client.post("/api/invoices/preview-from-selection", payload).then((r) => r.data);

const generateFromSelection = (payload) =>
  client.post("/api/invoices/generate-from-selection", payload).then((r) => r.data);

const appendToInvoice = (invoiceId, payload) =>
  client.post(`/api/invoices/${invoiceId}/append`, payload).then((r) => r.data);

module.exports = { previewFromSelection, generateFromSelection, appendToInvoice };
