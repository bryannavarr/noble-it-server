const stripeService = require("./stripe.service");

// Creates a hosted Stripe Checkout session and returns the URL the customer
// can pay through. Charges are in USD; Checkout collects CC/debit + Link
// automatically. If the invoice never gets paid the session just expires —
// we don't hold local state for it (yet).
//
// The success/cancel URLs point at the noble-it storefront so customers
// don't dead-end on a Stripe page after paying. Adjust once you have a
// "Thank you" page.

const createCheckoutLink = async ({ amount, description, client_id, invoice_id }) => {
  if (!stripeService.isEnabled()) {
    const err = new Error(
      "Stripe is not configured on this server. Set STRIPE_SECRET_KEY in .env and restart.",
    );
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const stripe = stripeService.getClient();
  const base = process.env.PUBLIC_SITE_URL || "https://nobleit.co";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: description?.trim() || "Noble IT services",
          },
          // Stripe charges in the smallest currency unit — cents.
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      },
    ],
    // Metadata lets us reconcile a Stripe payment back to our own records
    // via webhook later (once webhooks are wired up).
    metadata: {
      client_id: client_id ? String(client_id) : "",
      invoice_id: invoice_id ? String(invoice_id) : "",
    },
    success_url: `${base}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/payment-cancelled`,
  });

  return { url: session.url, session_id: session.id };
};

module.exports = { createCheckoutLink };
