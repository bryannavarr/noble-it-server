// Thin HTTP client for talking to noble-msp-crm from noble-it-server.
// Both run on the same EC2 box; the admin backend forwards editor requests
// to the CRM's invoice endpoints so we don't duplicate PDF generation.
//
// Base URL comes from MSP_API_URL_INTERNAL (default: http://localhost:3100),
// so prod hits the same-host CRM without traversing the public nginx.

const axios = require("axios");

const baseURL = process.env.MSP_API_URL_INTERNAL || "http://localhost:3100";

// MSP_API_KEY is a shared secret between this server and noble-msp-crm.
// The CRM's invoice endpoints reject requests without it (401). Same value
// lives on the CLI's .env — see docs for the rotation flow. Pulled from
// env at request time so a redeploy of just this service picks up a rotated
// key without a full rebuild.
const client = axios.create({
  baseURL,
  timeout: 30000, // PDF generation + S3 upload can take a moment
  headers: { "Content-Type": "application/json" },
});
client.interceptors.request.use((config) => {
  const key = process.env.MSP_API_KEY;
  if (key) config.headers["x-api-key"] = key;
  return config;
});

const previewFromSelection = (payload) =>
  client.post("/api/invoices/preview-from-selection", payload).then((r) => r.data);

const generateFromSelection = (payload) =>
  client.post("/api/invoices/generate-from-selection", payload).then((r) => r.data);

const appendToInvoice = (invoiceId, payload) =>
  client.post(`/api/invoices/${invoiceId}/append`, payload).then((r) => r.data);

const regeneratePdf = (invoiceId) =>
  client.post(`/api/invoices/${invoiceId}/regenerate-pdf`).then((r) => r.data);

module.exports = {
  previewFromSelection,
  generateFromSelection,
  appendToInvoice,
  regeneratePdf,
};
