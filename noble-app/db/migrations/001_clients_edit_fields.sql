-- 001_clients_edit_fields.sql
-- Adds editable client fields needed by the admin client modal.
-- Run once per environment:  mysql noble_msp < this_file.sql
--
-- Changes:
--   * email: VARCHAR(255) -> LONGTEXT (comma-separated list of addresses)
--   * + website, source, acquired_at, last_serviced_at, under_contract, has_reviewed
--   * Backfill acquired_at = DATE(created_at) for existing rows.

ALTER TABLE clients MODIFY email LONGTEXT NOT NULL;

ALTER TABLE clients
  ADD COLUMN website VARCHAR(255) DEFAULT NULL,
  ADD COLUMN source VARCHAR(100) DEFAULT NULL,
  ADD COLUMN acquired_at DATE DEFAULT NULL,
  ADD COLUMN last_serviced_at DATE DEFAULT NULL,
  ADD COLUMN under_contract TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN has_reviewed TINYINT(1) NOT NULL DEFAULT 0;

UPDATE clients
SET acquired_at = DATE(created_at)
WHERE acquired_at IS NULL;
