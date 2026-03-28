/**
 * Database service — all SQL queries live here so the rest of the application
 * never touches raw SQL.
 */

const { getDatabase } = require('../utils/database');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Promisified `db.get`.
 *
 * @param {import('sqlite3').Database} db
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any>}
 */
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Promisified `db.run` — resolves with `{ lastID, changes }`.
 *
 * @param {import('sqlite3').Database} db
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<{ lastID: number; changes: number }>}
 */
function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Promisified `db.all`.
 *
 * @param {import('sqlite3').Database} db
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// ─── User operations ──────────────────────────────────────────────────────────

/**
 * Retrieves a user row by Discord ID, decrypting tokens before returning.
 *
 * @param {string} discordId
 * @returns {Promise<object | undefined>}
 */
async function getUserByDiscordId(discordId) {
  const db = await getDatabase();
  const row = await dbGet(db, 'SELECT * FROM users WHERE discord_id = ?', [discordId]);
  if (!row) return undefined;
  return decryptUserTokens(row);
}

/**
 * Retrieves a user row by Epic account ID.
 *
 * @param {string} epicAccountId
 * @returns {Promise<object | undefined>}
 */
async function getUserByEpicId(epicAccountId) {
  const db = await getDatabase();
  const row = await dbGet(db, 'SELECT * FROM users WHERE epic_account_id = ?', [epicAccountId]);
  if (!row) return undefined;
  return decryptUserTokens(row);
}

/**
 * Creates or updates a user record.
 *
 * @param {object} params
 * @param {string}  params.discordId
 * @param {string}  params.discordUsername
 * @param {string}  [params.epicAccountId]
 * @param {string}  [params.epicDisplayName]
 * @param {string}  [params.accessToken]
 * @param {string}  [params.refreshToken]
 * @param {number}  [params.tokenExpiresAt]  Unix timestamp (seconds)
 * @returns {Promise<void>}
 */
async function upsertUser({
  discordId,
  discordUsername,
  epicAccountId,
  epicDisplayName,
  accessToken,
  refreshToken,
  tokenExpiresAt,
}) {
  const db = await getDatabase();

  const encryptedAccess  = accessToken  ? encrypt(accessToken)  : null;
  const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

  await dbRun(
    db,
    `INSERT INTO users
       (discord_id, discord_username, epic_account_id, epic_display_name,
        access_token, refresh_token, token_expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
     ON CONFLICT(discord_id) DO UPDATE SET
       discord_username  = excluded.discord_username,
       epic_account_id   = COALESCE(excluded.epic_account_id,   epic_account_id),
       epic_display_name = COALESCE(excluded.epic_display_name, epic_display_name),
       access_token      = COALESCE(excluded.access_token,      access_token),
       refresh_token     = COALESCE(excluded.refresh_token,     refresh_token),
       token_expires_at  = COALESCE(excluded.token_expires_at,  token_expires_at),
       updated_at        = strftime('%s', 'now')`,
    [
      discordId,
      discordUsername,
      epicAccountId ?? null,
      epicDisplayName ?? null,
      encryptedAccess,
      encryptedRefresh,
      tokenExpiresAt ?? null,
    ]
  );
}

/**
 * Updates only the OAuth tokens for an existing user.
 *
 * @param {string} discordId
 * @param {object} tokens
 * @param {string} tokens.accessToken
 * @param {string} tokens.refreshToken
 * @param {number} tokens.tokenExpiresAt
 * @returns {Promise<void>}
 */
async function updateUserTokens(discordId, { accessToken, refreshToken, tokenExpiresAt }) {
  const db = await getDatabase();
  await dbRun(
    db,
    `UPDATE users
     SET access_token = ?, refresh_token = ?, token_expires_at = ?,
         updated_at = strftime('%s', 'now')
     WHERE discord_id = ?`,
    [encrypt(accessToken), encrypt(refreshToken), tokenExpiresAt, discordId]
  );
}

/**
 * Removes the Epic Games link from a user's record.
 *
 * @param {string} discordId
 * @returns {Promise<void>}
 */
async function unlinkEpicAccount(discordId) {
  const db = await getDatabase();
  await dbRun(
    db,
    `UPDATE users
     SET epic_account_id = NULL, epic_display_name = NULL,
         access_token = NULL, refresh_token = NULL, token_expires_at = NULL,
         updated_at = strftime('%s', 'now')
     WHERE discord_id = ?`,
    [discordId]
  );
}

// ─── OAuth state operations ───────────────────────────────────────────────────

/**
 * Persists a new OAuth state token.
 *
 * @param {string} state
 * @param {string} discordId
 * @returns {Promise<void>}
 */
async function saveOAuthState(state, discordId) {
  const db = await getDatabase();
  // Expire states older than 10 minutes while we're here.
  await dbRun(db, `DELETE FROM oauth_states WHERE created_at < strftime('%s', 'now') - 600`);
  await dbRun(db, `INSERT INTO oauth_states (state, discord_id) VALUES (?, ?)`, [state, discordId]);
}

/**
 * Retrieves and immediately deletes an OAuth state token (one-time use).
 *
 * @param {string} state
 * @returns {Promise<string | undefined>}  The Discord ID associated with the state
 */
async function consumeOAuthState(state) {
  const db = await getDatabase();
  const row = await dbGet(db, `SELECT discord_id FROM oauth_states WHERE state = ?`, [state]);
  if (!row) return undefined;
  await dbRun(db, `DELETE FROM oauth_states WHERE state = ?`, [state]);
  return row.discord_id;
}

// ─── Command log ──────────────────────────────────────────────────────────────

/**
 * Records a command invocation.
 *
 * @param {string} discordId
 * @param {string} command
 * @param {string | null} guildId
 * @returns {Promise<void>}
 */
async function logCommand(discordId, command, guildId = null) {
  try {
    const db = await getDatabase();
    await dbRun(
      db,
      `INSERT INTO command_logs (discord_id, command, guild_id) VALUES (?, ?, ?)`,
      [discordId, command, guildId]
    );
  } catch (err) {
    // Non-fatal — don't let logging failures break commands.
    logger.warn('Failed to log command', { discordId, command, error: err.message });
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Decrypts the token fields on a raw database row.
 *
 * @param {object} row
 * @returns {object}
 */
function decryptUserTokens(row) {
  const result = { ...row };
  try {
    if (result.access_token)  result.access_token  = decrypt(result.access_token);
    if (result.refresh_token) result.refresh_token = decrypt(result.refresh_token);
  } catch (err) {
    logger.error('Failed to decrypt user tokens', { discordId: row.discord_id, error: err.message });
    result.access_token  = null;
    result.refresh_token = null;
  }
  return result;
}

module.exports = {
  getUserByDiscordId,
  getUserByEpicId,
  upsertUser,
  updateUserTokens,
  unlinkEpicAccount,
  saveOAuthState,
  consumeOAuthState,
  logCommand,
};
