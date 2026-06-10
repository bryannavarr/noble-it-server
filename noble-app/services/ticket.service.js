const pool = require("../db/pool");

const SORT_COLUMN_SQL = {
  ticket_number: "t.ticket_number",
  subject: "t.subject",
  client_name: "c.name",
  category: "t.category",
  priority: "t.priority",
  status: "t.status",
  created_at: "t.created_at",
};

// Search hits ticket number, subject, and the joined client name.
const SEARCH_WHERE_SQL = `
  t.ticket_number LIKE ?
  OR t.subject LIKE ?
  OR c.name LIKE ?
`;

const listPaginated = async ({ page, pageSize, search, sort, sortDir }) => {
  const offset = (page - 1) * pageSize;
  const hasSearch = !!(search && search.trim());
  const like = `%${(search || "").trim()}%`;
  const orderCol = SORT_COLUMN_SQL[sort] || "t.created_at";
  const orderDir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const whereSql = hasSearch ? `WHERE ${SEARCH_WHERE_SQL}` : "";
  const whereParams = hasSearch ? [like, like, like] : [];

  // LIMIT/OFFSET inlined as numbers (already validated by Joi) — mysql2's
  // prepared-statement path won't bind them otherwise. Search terms stay
  // parameterized.
  const [items] = await pool.query(
    `SELECT
       t.id,
       t.ticket_number,
       t.subject,
       t.category,
       t.priority,
       t.status,
       t.created_at,
       t.updated_at,
       t.client_id,
       c.name AS client_name
     FROM tickets t
     JOIN clients c ON c.id = t.client_id
     ${whereSql}
     ORDER BY ${orderCol} ${orderDir}, t.id ${orderDir}
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    whereParams,
  );

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM tickets t
     JOIN clients c ON c.id = t.client_id
     ${whereSql}`,
    whereParams,
  );

  return { items, total: countRow.total };
};

module.exports = { listPaginated };
