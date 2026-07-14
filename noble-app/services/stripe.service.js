// Thin wrapper around the Stripe SDK. Only initializes when STRIPE_SECRET_KEY
// is present so the whole server doesn't crash if Stripe isn't set up yet.
// Callers check isEnabled() and either use client or degrade gracefully.
//
// To wire up:
//   1. npm install stripe
//   2. Add STRIPE_SECRET_KEY=sk_test_... (or sk_live_...) to .env
//   3. Restart the server

let stripe = null;
let enabled = false;

const secret = process.env.STRIPE_SECRET_KEY;
if (secret) {
  try {
    const Stripe = require("stripe");
    stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
    enabled = true;
  } catch (err) {
    // Package not installed yet, or import failed. Leave disabled so the
    // rest of the app keeps running.
    console.warn("Stripe SDK not available:", err.message);
  }
}

const isEnabled = () => enabled;
const getClient = () => stripe;

module.exports = { isEnabled, getClient };
