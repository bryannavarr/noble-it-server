const pool = require("../db/pool");

const SELECT_COLUMNS = `
  id,
  client_id,
  invoice_number,
  invoice_date,
  due_date,
  total_hours,
  total_amount,
  status,
  pdf_path,
  is_in_cloud,
  sent_at,
  paid_at,
  created_at,
  updated_at
`;

const listByClientId = async (clientId) => {
  const [items] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM invoices
     WHERE client_id = ?
     ORDER BY invoice_date DESC, id DESC`,
    [clientId],
  );
  return items;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM invoices WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

module.exports = { listByClientId, findById };
