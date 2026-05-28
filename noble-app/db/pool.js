const mysql = require("mysql2/promise");

// Shared connection pool. createPool is lazy — it doesn't open a connection
// until the first query, so requiring this module never throws on its own.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DBPASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
