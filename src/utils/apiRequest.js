/**
 * Thin wrapper around axios that adds structured error logging and a
 * consistent retry strategy for transient network failures.
 */

const axios = require('axios');
const logger = require('./logger');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Sleep for `ms` milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Makes an HTTP request with automatic retries on 5xx / network errors.
 *
 * @param {import('axios').AxiosRequestConfig} config
 * @param {number} [attempt]
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function apiRequest(config, attempt = 1) {
  try {
    const response = await axios(config);
    return response;
  } catch (err) {
    const status = err.response?.status;
    const isRetryable = !status || status >= 500;

    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * attempt;
      logger.warn('API request failed — retrying', {
        url: config.url,
        attempt,
        status,
        delay,
      });
      await sleep(delay);
      return apiRequest(config, attempt + 1);
    }

    logger.error('API request failed', {
      url: config.url,
      status,
      message: err.message,
    });
    throw err;
  }
}

module.exports = { apiRequest };
