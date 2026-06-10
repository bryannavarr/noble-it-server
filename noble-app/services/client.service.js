const pool = require("../db/pool");

// Whitelist mapping API column name -> SQL expression. Keep keys in sync with
// CLIENT_SORT_COLUMNS in models/validation/index.js.
const SORT_COLUMN_SQL = {
  name: "name",
  contact_name: "contact_name",
  email: "email",
  phone: "phone",
  default_rate: "default_rate",
  created_at: "created_at",
};

// Search hits company name, contact name, and email.
const SEARCH_WHERE_SQL = `
  name LIKE ?
  OR contact_name LIKE ?
  OR email LIKE ?
`;

const listPaginated = async ({ page, pageSize, search, sort, sortDir }) => {
  const offset = (page - 1) * pageSize;
  const hasSearch = !!(search && search.trim());
  const like = `%${(search || "").trim()}%`;

  const orderCol = SORT_COLUMN_SQL[sort] || "created_at";
  const orderDir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const whereSql = hasSearch ? `WHERE ${SEARCH_WHERE_SQL}` : "";
  const whereParams = hasSearch ? [like, like, like] : [];

  // LIMIT/OFFSET inlined as numbers (Joi-validated); search terms stay
  // parameterized. id is a stable tiebreaker for pagination.
  const [items] = await pool.query(
    `SELECT
       id,
       name,
       contact_name,
       email,
       phone,
       default_rate,
       created_at,
       updated_at
     FROM clients
     ${whereSql}
     ORDER BY ${orderCol} ${orderDir}, id ${orderDir}
     LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
    whereParams,
  );

  const countSql = hasSearch
    ? `SELECT COUNT(*) AS total FROM clients WHERE ${SEARCH_WHERE_SQL}`
    : `SELECT COUNT(*) AS total FROM clients`;

  const [[countRow]] = await pool.query(countSql, whereParams);

  return { items, total: countRow.total };
};

module.exports = { listPaginated };
