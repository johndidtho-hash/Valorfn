/**
 * Epic Games OAuth 2.0 service.
 *
 * Handles the full Authorization Code flow:
 *   1. generateAuthUrl  — build the URL the user visits to authorise
 *   2. exchangeCode     — swap the callback code for access + refresh tokens
 *   3. refreshTokens    — use a refresh token to get a new access token
 *   4. getAccountInfo   — fetch the Epic account profile for the authed user
 *
 * Docs: https://dev.epicgames.com/docs/epic-account-services/auth/auth-interface
 */

const { apiRequest } = require('../utils/apiRequest');
const logger = require('../utils/logger');

const EPIC_AUTH_BASE   = 'https://www.epicgames.com/id/api';
const EPIC_OAUTH_BASE  = 'https://api.epicgames.dev/epic/oauth/v2';
const EPIC_ACCOUNT_BASE = 'https://api.epicgames.dev/epic/id/v2';

/**
 * Returns the Basic auth header value for client credentials.
 *
 * @returns {string}
 */
function basicAuthHeader() {
  const clientId     = process.env.EPIC_CLIENT_ID;
  const clientSecret = process.env.EPIC_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('EPIC_CLIENT_ID and EPIC_CLIENT_SECRET must be set');
  }
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

/**
 * Builds the Epic Games OAuth authorisation URL.
 *
 * @param {string} state  CSRF state token
 * @returns {string}
 */
function generateAuthUrl(state) {
  const clientId   = process.env.EPIC_CLIENT_ID;
  const baseUrl    = process.env.BASE_URL ?? 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/epic/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    response_type: 'code',
    scope:         'basic_profile friends_list presence',
    redirect_uri:  redirectUri,
    state,
  });

  return `${EPIC_AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchanges an authorisation code for access and refresh tokens.
 *
 * @param {string} code  The `code` query parameter from the OAuth callback
 * @returns {Promise<{
 *   accessToken:    string;
 *   refreshToken:   string;
 *   tokenExpiresAt: number;
 *   accountId:      string;
 * }>}
 */
async function exchangeCode(code) {
  const baseUrl    = process.env.BASE_URL ?? 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/epic/callback`;

  const response = await apiRequest({
    method: 'POST',
    url:    `${EPIC_OAUTH_BASE}/token`,
    headers: {
      Authorization:  basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  const data = response.data;
  logger.info('Epic OAuth token exchange successful', { accountId: data.account_id });

  return {
    accessToken:    data.access_token,
    refreshToken:   data.refresh_token,
    tokenExpiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    accountId:      data.account_id,
  };
}

/**
 * Refreshes an expired access token using the stored refresh token.
 *
 * @param {string} refreshToken
 * @returns {Promise<{
 *   accessToken:    string;
 *   refreshToken:   string;
 *   tokenExpiresAt: number;
 * }>}
 */
async function refreshTokens(refreshToken) {
  const response = await apiRequest({
    method: 'POST',
    url:    `${EPIC_OAUTH_BASE}/token`,
    headers: {
      Authorization:  basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  const data = response.data;
  return {
    accessToken:    data.access_token,
    refreshToken:   data.refresh_token,
    tokenExpiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}

/**
 * Fetches the Epic Games account profile for the given account ID.
 *
 * @param {string} accessToken
 * @param {string} accountId
 * @returns {Promise<{ displayName: string; accountId: string }>}
 */
async function getAccountInfo(accessToken, accountId) {
  const response = await apiRequest({
    method: 'GET',
    url:    `${EPIC_ACCOUNT_BASE}/accounts`,
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { accountId },
  });

  const account = Array.isArray(response.data) ? response.data[0] : response.data;
  return {
    displayName: account.displayName ?? account.preferredLanguage ?? 'Unknown',
    accountId:   account.accountId,
  };
}

module.exports = { generateAuthUrl, exchangeCode, refreshTokens, getAccountInfo };
