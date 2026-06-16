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

// Same columns + the joined client name, used by the cross-client listing.
const LIST_SELECT_COLUMNS = `
  i.id,
  i.client_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.total_hours,
  i.total_amount,
  i.status,
  i.pdf_path,
  i.is_in_cloud,
  i.sent_at,
  i.paid_at,
  i.created_at,
  i.updated_at,
  c.name AS client_name
`;

// Whitelist mapping API column name -> SQL expression. Keep keys in sync with
// INVOICE_SORT_COLUMNS in models/validation/index.js.
const SORT_COLUMN_SQL = {
  invoice_number: "i.invoice_number",
  client_name: "c.name",
  invoice_date: "i.invoice_date",
  due_date: "i.due_date",
  total_amount: "i.total_amount",
  status: "i.status",
};

// Search hits invoice number and the joined client name.
const SEARCH_WHERE_SQL = `
  i.invoice_number LIKE ?
  OR c.name LIKE ?
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
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM invoices WHERE id = ? LIMIT 1`, [
    id,
  ]);
  return rows[0] || null;
};

const listPaginated = async ({ page, pageSize, search, sort, sortDir }) => {
  const offset = (page - 1) * pageSize;
  const hasSearch = !!(search && search.trim());
  const like = `%${(search || "").trim()}%`;

  const orderCol = SORT_COLUMN_SQL[sort] || "i.invoice_date";
  const orderDir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const whereSql = hasSearch ? `WHERE ${SEARCH_WHERE_SQL}` : "";
  const whereParams = hasSearch ? [like, like] : [];

  const [items] = await pool.query(
    `SELECT ${LIST_SELECT_COLUMNS}
     FROM invoices i
     JOIN clients c ON c.id = i.client_id
     ${whereSql}
     ORDER BY ${orderCol} ${orderDir}, i.id ${orderDir}
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    whereParams,
  );

  const countSql = hasSearch
    ? `SELECT COUNT(*) AS total
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE ${SEARCH_WHERE_SQL}`
    : `SELECT COUNT(*) AS total FROM invoices`;

  const [[countRow]] = await pool.query(countSql, whereParams);

  return { items, total: countRow.total };
};

module.exports = { listByClientId, findById, listPaginated };
