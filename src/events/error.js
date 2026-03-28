/**
 * Discord client `error` event — catches unhandled errors emitted by the
 * Discord.js client (e.g. WebSocket errors) so they don't crash the process.
 */

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.Error,
  once: false,

  /**
   * @param {Error} error
   */
  execute(error) {
    logger.error('Discord client error', { message: error.message, stack: error.stack });
  },
};
