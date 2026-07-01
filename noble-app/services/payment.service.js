const pool = require("../db/pool");

const SELECT_COLUMNS = `
  id,
  invoice_id,
  client_id,
  amount,
  method,
  paid_date,
  reference_number,
  notes,
  created_at,
  updated_at
`;

// For per-client listings we join the (optional) invoice so the UI can label
// direct payments differently from invoice-linked ones.
const LIST_SELECT_COLUMNS = `
  p.id,
  p.invoice_id,
  p.client_id,
  p.amount,
  p.method,
  p.paid_date,
  p.reference_number,
  p.notes,
  p.created_at,
  p.updated_at,
  i.invoice_number
`;

// All payments against one invoice, oldest first.
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

// All payments for a client (direct + invoice-linked), newest first — most
// recent activity floats to the top of the tab.
const listByClientId = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT ${LIST_SELECT_COLUMNS}
     FROM payments p
     LEFT JOIN invoices i ON i.id = p.invoice_id
     WHERE p.client_id = ?
     ORDER BY p.paid_date DESC, p.id DESC`,
    [clientId],
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
// Called from create/delete inside the same transaction, ONLY when the
// payment is tied to an invoice — direct payments don't touch invoice state.
const recomputeInvoiceStatus = async (conn, invoiceId) => {
  const [[invoice]] = await conn.query(
    `SELECT id, total_amount, status FROM invoices WHERE id = ? FOR UPDATE`,
    [invoiceId],
  );
  if (!invoice) return null;

  const [[agg]] = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) AS paid_total, MAX(paid_date) AS last_paid_date
     FROM payments WHERE invoice_id = ?`,
    [invoiceId],
  );

  const paidTotal = Number(agg.paid_total);
  const total = Number(invoice.total_amount);
  const isFullyPaid = paidTotal + 0.005 >= total;

  if (isFullyPaid) {
    await conn.query(
      `UPDATE invoices SET status = 'PAID', paid_at = ? WHERE id = ?`,
      [agg.last_paid_date, invoiceId],
    );
    return { status: "PAID", paid_at: agg.last_paid_date, paid_total: paidTotal };
  }

  if (invoice.status === "PAID") {
    await conn.query(
      `UPDATE invoices SET status = 'SENT', paid_at = NULL WHERE id = ?`,
      [invoiceId],
    );
  }
  return {
    status: invoice.status === "PAID" ? "SENT" : invoice.status,
    paid_at: null,
    paid_total: paidTotal,
  };
};

// Verify a client exists; used before inserting a direct payment so we return
// a clean 404 instead of a FK constraint error.
const clientExists = async (conn, clientId) => {
  const [[row]] = await conn.query(`SELECT id FROM clients WHERE id = ? FOR UPDATE`, [clientId]);
  return !!row;
};

// Create one payment (invoice-linked OR direct) + recompute invoice status
// atomically if there is an invoice.
const create = async (payload) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (!(await clientExists(conn, payload.client_id))) {
      const err = new Error("Client not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    if (payload.invoice_id) {
      const [[invoice]] = await conn.query(
        `SELECT id, client_id FROM invoices WHERE id = ? FOR UPDATE`,
        [payload.invoice_id],
      );
      if (!invoice) {
        const err = new Error("Invoice not found");
        err.code = "NOT_FOUND";
        throw err;
      }
      // Guard against linking a payment to an invoice owned by a different
      // client — that would corrupt the per-client totals.
      if (Number(invoice.client_id) !== Number(payload.client_id)) {
        const err = new Error("Invoice does not belong to this client");
        err.code = "VALIDATION";
        throw err;
      }
    }

    const [result] = await conn.query(
      `INSERT INTO payments
         (invoice_id, client_id, amount, method, paid_date, reference_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.invoice_id || null,
        payload.client_id,
        payload.amount,
        payload.method,
        payload.paid_date,
        payload.reference_number || null,
        payload.notes || null,
      ],
    );

    if (payload.invoice_id) {
      await recomputeInvoiceStatus(conn, payload.invoice_id);
    }

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

// Delete one payment + recompute if it was invoice-linked. Returns the
// invoice_id (may be null for direct payments) so callers can decide whether
// to refetch invoice state.
const deleteById = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[payment]] = await conn.query(
      `SELECT id, invoice_id, client_id FROM payments WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!payment) {
      const err = new Error("Payment not found");
      err.code = "NOT_FOUND";
      throw err;
    }

    await conn.query(`DELETE FROM payments WHERE id = ?`, [id]);
    if (payment.invoice_id) {
      await recomputeInvoiceStatus(conn, payment.invoice_id);
    }

    await conn.commit();
    return { id, invoice_id: payment.invoice_id, client_id: payment.client_id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { listByInvoiceId, listByClientId, findById, create, deleteById };
