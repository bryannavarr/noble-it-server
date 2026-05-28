const pool = require("../db/pool");

const findByEmail = async (email) => {
  const [rows] = await pool.query(
    "SELECT id, email, password_hash, name, role, is_active FROM admin_users WHERE email = ? LIMIT 1",
    [String(email).trim().toLowerCase()],
  );
  return rows[0] || null;
};

const touchLastLogin = async (id) => {
  await pool.query(
    "UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id],
  );
};

module.exports = { findByEmail, touchLastLogin };
