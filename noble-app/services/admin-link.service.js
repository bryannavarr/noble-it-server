const pool = require("../db/pool");

const SELECT_COLUMNS = `id, label, url, sort_order, created_at, updated_at`;

// Ordered by sort_order (user-controlled), then created_at as a stable
// tiebreaker so equal sort values don't jitter between requests.
const list = async () => {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM admin_links
     ORDER BY sort_order ASC, created_at ASC`,
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM admin_links WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    `INSERT INTO admin_links (label, url, sort_order) VALUES (?, ?, ?)`,
    [payload.label, payload.url, payload.sort_order ?? 0],
  );
  return findById(result.insertId);
};

// Partial update — only the keys the caller passes get UPDATE'd.
const updateById = async (id, data) => {
  const setParts = [];
  const values = [];
  for (const col of ["label", "url", "sort_order"]) {
    if (!Object.prototype.hasOwnProperty.call(data, col)) continue;
    setParts.push(`${col} = ?`);
    values.push(data[col]);
  }
  if (!setParts.length) return null;
  values.push(id);
  await pool.query(
    `UPDATE admin_links SET ${setParts.join(", ")} WHERE id = ?`,
    values,
  );
  return findById(id);
};

const deleteById = async (id) => {
  const [result] = await pool.query(`DELETE FROM admin_links WHERE id = ?`, [id]);
  return result.affectedRows > 0;
};

module.exports = { list, findById, create, updateById, deleteById };
