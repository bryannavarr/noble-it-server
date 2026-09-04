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

const SELECT_COLUMNS = `
  t.id,
  t.ticket_number,
  t.subject,
  t.description,
  t.category,
  t.priority,
  t.status,
  t.archived_at,
  t.created_at,
  t.updated_at,
  t.client_id,
  c.name AS client_name
`;

// Per-request archive filter → SQL clause. Default hides archived rows so
// the day-to-day list stays focused; "archived" and "all" are toggles the
// UI exposes.
const archiveClause = (mode) => {
  if (mode === "archived") return "t.archived_at IS NOT NULL";
  if (mode === "all") return "1=1";
  return "t.archived_at IS NULL";
};

const listPaginated = async ({ page, pageSize, search, sort, sortDir, archived }) => {
  const offset = (page - 1) * pageSize;
  const hasSearch = !!(search && search.trim());
  const like = `%${(search || "").trim()}%`;
  const orderCol = SORT_COLUMN_SQL[sort] || "t.created_at";
  const orderDir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const archiveSql = archiveClause(archived);
  const whereParts = [archiveSql];
  const whereParams = [];
  if (hasSearch) {
    whereParts.push(`(${SEARCH_WHERE_SQL})`);
    whereParams.push(like, like, like);
  }
  const whereSql = `WHERE ${whereParts.join(" AND ")}`;

  const [items] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
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

const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM tickets t
     JOIN clients c ON c.id = t.client_id
     WHERE t.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

// Ticket numbers are per-client sequences (UNIK-27, BELL-6, etc.). We hold
// a row-lock on the client while allocating the next number so two concurrent
// creates don't collide. Note: this table (client_ticket_sequences) already
// exists — the CLI's msp create path uses the same allocation.
const allocateNextTicketNumber = async (conn, clientId) => {
  const [[client]] = await conn.query(
    `SELECT id, invoice_prefix FROM clients WHERE id = ? FOR UPDATE`,
    [clientId],
  );
  if (!client) {
    const err = new Error("Client not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Upsert-then-increment. Row is created lazily on first ticket per client.
  await conn.query(
    `INSERT INTO client_ticket_sequences (client_id, last_number)
     VALUES (?, 0)
     ON DUPLICATE KEY UPDATE client_id = client_id`,
    [clientId],
  );
  const [[seq]] = await conn.query(
    `SELECT last_number FROM client_ticket_sequences WHERE client_id = ? FOR UPDATE`,
    [clientId],
  );
  const next = Number(seq.last_number) + 1;
  await conn.query(
    `UPDATE client_ticket_sequences SET last_number = ? WHERE client_id = ?`,
    [next, clientId],
  );
  return `${client.invoice_prefix}-${next}`;
};

const create = async (payload) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const ticketNumber = await allocateNextTicketNumber(conn, payload.client_id);

    // Build INSERT dynamically so we only include created_at when the caller
    // supplied an override — otherwise MySQL applies its CURRENT_TIMESTAMP
    // default and everything Just Works.
    const hasCreatedAt = payload.created_at != null;
    const cols = [
      "ticket_number",
      "client_id",
      "subject",
      "description",
      "category",
      "priority",
      "status",
    ];
    const vals = [
      ticketNumber,
      payload.client_id,
      payload.subject,
      payload.description || null,
      payload.category,
      payload.priority || "MEDIUM",
      payload.status || "IN_PROGRESS",
    ];
    if (hasCreatedAt) {
      cols.push("created_at");
      // Format Date → 'YYYY-MM-DD HH:MM:SS' so MySQL parses regardless of
      // the connection's timezone quirks.
      const d = new Date(payload.created_at);
      const iso = d.toISOString().slice(0, 19).replace("T", " ");
      vals.push(iso);
    }

    const [result] = await conn.query(
      `INSERT INTO tickets (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      vals,
    );
    const ticketId = result.insertId;

    // Optional inline work_logs — batch-attach at create time so the admin
    // can log historical hours in one form instead of jumping to a second
    // screen after saving.
    if (Array.isArray(payload.work_logs) && payload.work_logs.length) {
      for (const log of payload.work_logs) {
        const workedDate = new Date(log.worked_date).toISOString().slice(0, 10);
        await conn.query(
          `INSERT INTO work_logs
             (ticket_id, client_id, qty, description, worked_date)
           VALUES (?, ?, ?, ?, ?)`,
          [
            ticketId,
            payload.client_id,
            Number(log.qty),
            log.description?.trim() || null,
            workedDate,
          ],
        );
      }
    }

    await conn.commit();
    return findById(ticketId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Partial update — only writes columns present in `data`.
const updateById = async (id, data) => {
  const cols = ["subject", "description", "category", "priority", "status"];
  const setParts = [];
  const values = [];
  for (const col of cols) {
    if (!Object.prototype.hasOwnProperty.call(data, col)) continue;
    setParts.push(`${col} = ?`);
    const v = data[col];
    values.push(v === "" ? null : v);
  }
  if (!setParts.length) return findById(id);
  values.push(id);
  await pool.query(`UPDATE tickets SET ${setParts.join(", ")} WHERE id = ?`, values);
  return findById(id);
};

const setArchived = async (id, archived) => {
  await pool.query(
    `UPDATE tickets SET archived_at = ${archived ? "CURRENT_TIMESTAMP" : "NULL"} WHERE id = ?`,
    [id],
  );
  return findById(id);
};

// Bulk archive/unarchive. Returns the number of rows actually touched (may
// be less than ids.length if some ids don't exist).
const bulkSetArchived = async (ids, archived) => {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE tickets
     SET archived_at = ${archived ? "CURRENT_TIMESTAMP" : "NULL"}
     WHERE id IN (${placeholders})`,
    ids,
  );
  return result.affectedRows;
};

module.exports = {
  listPaginated,
  findById,
  create,
  updateById,
  setArchived,
  bulkSetArchived,
};
