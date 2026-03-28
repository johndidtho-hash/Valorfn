/**
 * Database initialisation utility.
 *
 * Opens (or creates) the SQLite database file and runs all DDL migrations so
 * the rest of the application can assume the schema is always up-to-date.
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../../data/valorfn.db');

/** @type {sqlite3.Database | null} */
let _db = null;

/**
 * Returns the singleton database connection, creating and initialising it on
 * the first call.
 *
 * @returns {Promise<sqlite3.Database>}
 */
async function getDatabase() {
  if (_db) return _db;

  // Ensure the data directory exists.
  const fs = require('fs');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      _db = db;
      runMigrations(db).then(() => resolve(db)).catch(reject);
    });
  });
}

/**
 * Executes all schema migrations in order.
 *
 * @param {sqlite3.Database} db
 * @returns {Promise<void>}
 */
async function runMigrations(db) {
  const migrations = [
    // Enable WAL mode for better concurrent read performance.
    `PRAGMA journal_mode = WAL`,

    // Core user table — one row per Discord user.
    `CREATE TABLE IF NOT EXISTS users (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id       TEXT    NOT NULL UNIQUE,
      discord_username TEXT    NOT NULL,
      epic_account_id  TEXT,
      epic_display_name TEXT,
      access_token     TEXT,
      refresh_token    TEXT,
      token_expires_at INTEGER,
      created_at       INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at       INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`,

    // Pending OAuth state tokens — maps a random state string to a Discord user.
    `CREATE TABLE IF NOT EXISTS oauth_states (
      state       TEXT    NOT NULL PRIMARY KEY,
      discord_id  TEXT    NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`,

    // Simple command-usage audit log.
    `CREATE TABLE IF NOT EXISTS command_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id  TEXT    NOT NULL,
      command     TEXT    NOT NULL,
      guild_id    TEXT,
      used_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )`,
  ];

  for (const sql of migrations) {
    await run(db, sql);
  }
}

/**
 * Promisified wrapper around `db.run`.
 *
 * @param {sqlite3.Database} db
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<void>}
 */
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { getDatabase };
