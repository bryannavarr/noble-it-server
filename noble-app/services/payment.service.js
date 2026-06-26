const pool = require("../db/pool");

const SELECT_COLUMNS = `
  id,
  invoice_id,
  amount,
  method,
  paid_date,
  reference_number,
  notes,
  created_at,
  updated_at
`;

// All payments against one invoice, oldest first so callers can render a
// chronological history.
const listByInvoiceId = async (invoiceId) => {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM payments
     WHERE invoice_id = ?
     ORDER BY paid_date ASC, id ASC`,
    [invoiceId],
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM payments WHERE id = ? LIMIT 1`, [
    id,
  ]);
  return rows[0] || null;
};

// Re-evaluates invoices.status + paid_at from the current payments rows.
// Called from createPayment / deletePayment inside the same transaction as
// the write, so the invoice and its payments never disagree.
//
//   sum(payments.amount) >= invoice.total_amount → PAID, paid_at = MAX(paid_date)
//   otherwise                                   → revert to SENT, paid_at = NULL
//                                                 (DRAFT/PENDING/APPROVED skipped — we
//                                                 don't auto-flip those backwards either)
const recomputeInvoiceStatus = async (conn, invoiceId) => {
  const [[invoice]] = await conn.query(
    `SELECT id, total_amount, status FROM invoices WHERE id = ? FOR UPDATE`,
    [invoiceId],
  );
  if (!invoice) return null;

  const [[agg]] = await conn.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS paid_total,
       MAX(paid_date)           AS last_paid_date
     FROM payments
     WHERE invoice_id = ?`,
    [invoiceId],
  );

  const paidTotal = Number(agg.paid_total);
  const total = Number(invoice.total_amount);
  // Penny tolerance for DECIMAL rounding so $99.999 ≈ $100 doesn't sit underpaid.
  const isFullyPaid = paidTotal + 0.005 >= total;

  if (isFullyPaid) {
    await conn.query(
      `UPDATE invoices SET status = 'PAID', paid_at = ? WHERE id = ?`,
      [agg.last_paid_date, invoiceId],
    );
    return { status: "PAID", paid_at: agg.last_paid_date, paid_total: paidTotal };
  }

  // Not fully paid. If we were previously PAID, revert to SENT (the most
  // common pre-PAID state). Otherwise leave the workflow status alone —
  // DRAFT/PENDING_APPROVAL/APPROVED users haven't sent the invoice yet, and
  // a payment shouldn't fake-promote those states.
  if (invoice.status === "PAID") {
    await conn.query(
      `UPDATE invoices SET status = 'SENT', paid_at = NULL WHERE id = ?`,
      [invoiceId],
    );
  }
  return { status: invoice.status === "PAID" ? "SENT" : invoice.status, paid_at: null, paid_total: paidTotal };
};

// Create one payment + recompute invoice status atomically.
const create = async (payload) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the invoice so concurrent payment writes don't race on the sync.
    const [[invoice]] = await conn.query(
      `SELECT id FROM invoices WHERE id = ? FOR UPDATE`,
      [payload.invoice_id],
    );
    if (!invoice) {
      const err = new Error("Invoice not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    const [result] = await conn.query(
      `INSERT INTO payments
         (invoice_id, amount, method, paid_date, reference_number, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.invoice_id,
        payload.amount,
        payload.method,
        payload.paid_date,
        payload.reference_number || null,
        payload.notes || null,
      ],
    );

    await recomputeInvoiceStatus(conn, payload.invoice_id);

    await conn.commit();

    const [[row]] = await pool.query(
      `SELECT ${SELECT_COLUMNS} FROM payments WHERE id = ?`,
      [result.insertId],
    );
    return row;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Delete one payment + recompute. Returns the invoice_id so the controller
// can tell the caller "what the invoice status is now".
const deleteById = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[payment]] = await conn.query(
      `SELECT id, invoice_id FROM payments WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!payment) {
      const err = new Error("Payment not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    await conn.query(`DELETE FROM payments WHERE id = ?`, [id]);
    await recomputeInvoiceStatus(conn, payment.invoice_id);

    await conn.commit();
    return { id, invoice_id: payment.invoice_id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { listByInvoiceId, findById, create, deleteById };
