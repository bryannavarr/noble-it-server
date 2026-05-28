// Seeds (or updates) the first admin user from .env values.
// Idempotent: creates the admin_users table if missing, then upserts the
// admin identified by ADMIN_EMAIL with the bcrypt hash in ADMIN_PASSWORD_HASH.
//
// Usage: npm run seed:admin
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

const main = async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!email || !passwordHash) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD_HASH must be set in .env");
  }

  const schema = fs.readFileSync(
    path.join(__dirname, "../db/schema.sql"),
    "utf8",
  );
  await pool.query(schema);

  await pool.query(
    `INSERT INTO admin_users (email, password_hash, role)
     VALUES (?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [email, passwordHash],
  );

  console.log(`Seeded admin user: ${email}`);
};

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Seed failed:", err.message);
    pool.end();
    process.exit(1);
  });
