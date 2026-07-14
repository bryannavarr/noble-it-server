const pool = require("../db/pool");

// Cash flow. `range = 'month'` → sum for the current calendar month.
// `range = 'year'` → sum for the current calendar year. Both sums are over
// ALL payments (invoice-linked + direct) so retainer income lands in the
// same total as invoice-paid income.
const cashFlow = async (range = "month") => {
  const period =
    range === "year"
      ? `DATE_FORMAT(paid_date, '%Y') = DATE_FORMAT(CURDATE(), '%Y')`
      : `DATE_FORMAT(paid_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`;
  const [[row]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
     FROM payments
     WHERE ${period}`,
  );
  return {
    range,
    total: Number(row.total),
    count: Number(row.count),
  };
};

// Top all-time clients by lifetime revenue. Names + a normalized "rank score"
// (0..1) so the frontend can draw a relative bar without exposing raw dollars.
const topClients = async (limit = 5) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, COALESCE(SUM(p.amount), 0) AS total
     FROM clients c
     LEFT JOIN payments p ON p.client_id = c.id
     GROUP BY c.id
     HAVING total > 0
     ORDER BY total DESC
     LIMIT ${Math.max(1, Math.min(20, Number(limit) || 5))}`,
  );
  const top = Number(rows[0]?.total ?? 0);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    // The frontend never sees the raw amount — only the relative rank.
    rank_score: top > 0 ? Number(r.total) / top : 0,
  }));
};

const newClientsThisMonth = async () => {
  const [rows] = await pool.query(
    `SELECT id, name, created_at
     FROM clients
     WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
     ORDER BY created_at DESC`,
  );
  return { count: rows.length, items: rows };
};

// Invoices generated (by invoice_date) this calendar month, with the total
// dollar value so we can show "$X.XX across N invoices" on one card.
const invoicesThisMonth = async () => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total
     FROM invoices
     WHERE DATE_FORMAT(invoice_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`,
  );
  return { count: Number(row.count), total: Number(row.total) };
};

// Ticket backlog — open / in-progress work, grouped by client so the card
// can show "N tickets across M clients" plus the top offenders.
const ticketBacklog = async () => {
  const [rows] = await pool.query(
    `SELECT c.id AS client_id, c.name AS client_name, COUNT(*) AS open_count
     FROM tickets t
     JOIN clients c ON c.id = t.client_id
     WHERE t.status IN ('OPEN', 'IN_PROGRESS')
     GROUP BY c.id
     ORDER BY open_count DESC, c.name ASC`,
  );
  const totalOpen = rows.reduce((s, r) => s + Number(r.open_count), 0);
  return {
    total_open: totalOpen,
    client_count: rows.length,
    // Cap the list at 5 for the card — full list is available on /admin/tickets.
    top_clients: rows.slice(0, 5).map((r) => ({
      client_id: r.client_id,
      client_name: r.client_name,
      open_count: Number(r.open_count),
    })),
  };
};

module.exports = {
  cashFlow,
  topClients,
  newClientsThisMonth,
  invoicesThisMonth,
  ticketBacklog,
};
