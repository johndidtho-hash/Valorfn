/**
 * User authentication service.
 *
 * Orchestrates the Epic Games OAuth flow and keeps stored tokens fresh.
 */

const crypto = require('crypto');
const {
  getUserByDiscordId,
  upsertUser,
  updateUserTokens,
  saveOAuthState,
  consumeOAuthState,
  unlinkEpicAccount,
} = require('./database');
const { generateAuthUrl, exchangeCode, refreshTokens, getAccountInfo } = require('./epicOAuth');
const logger = require('../utils/logger');

/**
 * Generates a secure random state token, persists it, and returns the full
 * Epic Games authorisation URL for the given Discord user.
 *
 * @param {string} discordId
 * @returns {Promise<string>}  The URL to send the user to
 */
async function beginOAuthFlow(discordId) {
  const state = crypto.randomBytes(24).toString('hex');
  await saveOAuthState(state, discordId);
  return generateAuthUrl(state);
}

/**
 * Handles the OAuth callback: validates the state, exchanges the code for
 * tokens, fetches the Epic account profile, and persists everything.
 *
 * @param {string} code   The `code` query param from Epic's redirect
 * @param {string} state  The `state` query param from Epic's redirect
 * @param {string} discordUsername  Used to populate the user record if new
 * @returns {Promise<{
 *   discordId:       string;
 *   epicDisplayName: string;
 *   epicAccountId:   string;
 * }>}
 */
async function handleOAuthCallback(code, state, discordUsername = 'Unknown') {
  // Validate and consume the state token (prevents CSRF).
  const discordId = await consumeOAuthState(state);
  if (!discordId) {
    throw new Error('Invalid or expired OAuth state token');
  }

  // Exchange the authorisation code for tokens.
  const { accessToken, refreshToken, tokenExpiresAt, accountId } = await exchangeCode(code);

  // Fetch the Epic account profile.
  const { displayName } = await getAccountInfo(accessToken, accountId);

  // Persist the user record.
  await upsertUser({
    discordId,
    discordUsername,
    epicAccountId:   accountId,
    epicDisplayName: displayName,
    accessToken,
    refreshToken,
    tokenExpiresAt,
  });

  logger.info('Epic account linked', { discordId, epicAccountId: accountId, displayName });

  return { discordId, epicDisplayName: displayName, epicAccountId: accountId };
}

/**
 * Returns a valid access token for the given Discord user, refreshing it
 * automatically if it has expired or is about to expire (within 5 minutes).
 *
 * @param {string} discordId
 * @returns {Promise<string>}  A valid access token
 * @throws {Error} If the user has no linked Epic account
 */
async function getValidAccessToken(discordId) {
  const user = await getUserByDiscordId(discordId);

  if (!user || !user.access_token) {
    throw new Error('No linked Epic account found. Use /link to connect your account.');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const bufferSeconds = 5 * 60; // refresh 5 minutes before expiry

  if (user.token_expires_at && user.token_expires_at - nowSeconds > bufferSeconds) {
    return user.access_token;
  }

  // Token is expired or about to expire — refresh it.
  logger.info('Refreshing Epic access token', { discordId });

  const tokens = await refreshTokens(user.refresh_token);
  await updateUserTokens(discordId, tokens);

  return tokens.accessToken;
}

/**
 * Unlinks the Epic Games account from a Discord user.
 *
 * @param {string} discordId
 * @returns {Promise<void>}
 */
async function unlinkAccount(discordId) {
  await unlinkEpicAccount(discordId);
  logger.info('Epic account unlinked', { discordId });
}

module.exports = { beginOAuthFlow, handleOAuthCallback, getValidAccessToken, unlinkAccount };
