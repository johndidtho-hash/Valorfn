/**
 * Fortnite API service.
 *
 * Wraps https://fortniteapi.io to retrieve player statistics and cosmetic
 * information.  All public endpoints use the FORTNITE_API_KEY header.
 */

const { apiRequest } = require('../utils/apiRequest');
const logger = require('../utils/logger');

const BASE_URL = 'https://fortniteapi.io/v1';

/**
 * Returns the common request headers for the Fortnite API.
 *
 * @returns {Record<string, string>}
 */
function headers() {
  const key = process.env.FORTNITE_API_KEY;
  if (!key) throw new Error('FORTNITE_API_KEY is not set');
  return { Authorization: key };
}

/**
 * Fetches lifetime Battle Royale stats for a player by their Epic display name.
 *
 * @param {string} username  Epic Games display name
 * @returns {Promise<object>}
 */
async function getStatsByUsername(username) {
  logger.debug('Fetching Fortnite stats', { username });

  const response = await apiRequest({
    method: 'GET',
    url:    `${BASE_URL}/stats`,
    headers: headers(),
    params: { username },
  });

  return response.data;
}

/**
 * Fetches lifetime Battle Royale stats for a player by their Epic account ID.
 *
 * @param {string} accountId  Epic Games account ID
 * @returns {Promise<object>}
 */
async function getStatsByAccountId(accountId) {
  logger.debug('Fetching Fortnite stats by account ID', { accountId });

  const response = await apiRequest({
    method: 'GET',
    url:    `${BASE_URL}/stats`,
    headers: headers(),
    params: { account: accountId },
  });

  return response.data;
}

/**
 * Fetches the current Fortnite item shop.
 *
 * @returns {Promise<object>}
 */
async function getItemShop() {
  logger.debug('Fetching Fortnite item shop');

  const response = await apiRequest({
    method: 'GET',
    url:    `${BASE_URL}/shop`,
    headers: headers(),
    params: { lang: 'en' },
  });

  return response.data;
}

/**
 * Fetches the current season's map information.
 *
 * @returns {Promise<object>}
 */
async function getMap() {
  const response = await apiRequest({
    method: 'GET',
    url:    `${BASE_URL}/game/map`,
    headers: headers(),
  });

  return response.data;
}

/**
 * Formats raw stat data into a human-readable summary object.
 *
 * @param {object} data  Raw API response from getStatsByUsername / getStatsByAccountId
 * @returns {{
 *   username:    string;
 *   wins:        number;
 *   kills:       number;
 *   matches:     number;
 *   kd:          string;
 *   winRate:     string;
 *   minutesPlayed: number;
 * } | null}
 */
function formatStats(data) {
  if (!data || !data.global_stats) return null;

  const global = data.global_stats;

  // Sum across all input modes (solo, duo, squad, etc.)
  let wins = 0, kills = 0, matches = 0, minutesPlayed = 0;

  for (const mode of Object.values(global)) {
    wins          += mode.placetop1    ?? 0;
    kills         += mode.kills        ?? 0;
    matches       += mode.matchesplayed ?? 0;
    minutesPlayed += mode.minutesplayed ?? 0;
  }

  const deaths  = matches - wins;
  const kd      = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
  const winRate = matches > 0 ? ((wins / matches) * 100).toFixed(1) : '0.0';

  return {
    username:     data.name ?? 'Unknown',
    wins,
    kills,
    matches,
    kd,
    winRate,
    minutesPlayed,
  };
}

module.exports = { getStatsByUsername, getStatsByAccountId, getItemShop, getMap, formatStats };
