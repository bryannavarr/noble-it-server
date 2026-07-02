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

// Columns the PATCH endpoint is allowed to write. Order doesn't matter;
// updateById builds the SET clause from whatever keys are present in `data`.
const UPDATABLE_COLUMNS = [
  "name",
  "contact_name",
  "email",
  "phone",
  "website",
  "default_rate",
  "source",
  "acquired_at",
  "last_serviced_at",
  "under_contract",
  "has_reviewed",
];

// Columns returned by list / find endpoints.
const SELECT_COLUMNS = `
  id,
  name,
  contact_name,
  email,
  phone,
  website,
  default_rate,
  source,
  acquired_at,
  last_serviced_at,
  under_contract,
  has_reviewed,
  created_at,
  updated_at
`;

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

  // Return the FULL client shape so the row object handed to the client
  // modal has every field the edit form touches. Returning a subset caused a
  // data-loss bug: the form initialState defaulted missing fields to ""/false
  // and the PATCH wrote those blanks back over real data.
  //
  // LIMIT/OFFSET inlined as numbers (Joi-validated); search terms stay
  // parameterized. id is a stable tiebreaker for pagination.
  const [items] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
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

const findById = async (id) => {
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM clients WHERE id = ? LIMIT 1`, [
    id,
  ]);
  return rows[0] || null;
};

// Builds a partial UPDATE from whitelisted keys in `data`. Returns the number
// of affected rows (0 means the id didn't exist).
const updateById = async (id, data) => {
  const setParts = [];
  const values = [];
  for (const col of UPDATABLE_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(data, col)) continue;
    setParts.push(`${col} = ?`);
    // Empty strings collapse to NULL for nullable optional fields.
    const v = data[col];
    values.push(v === "" ? null : v);
  }
  if (setParts.length === 0) return 0;
  values.push(id);

  const [result] = await pool.query(
    `UPDATE clients SET ${setParts.join(", ")} WHERE id = ?`,
    values,
  );
  return result.affectedRows;
};

module.exports = { listPaginated, findById, updateById };
