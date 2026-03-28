/**
 * Command registration script.
 *
 * Deploys slash commands to Discord via the REST API.
 *
 * Usage:
 *   # Register globally (takes up to 1 hour to propagate):
 *   node src/scripts/registerCommands.js
 *
 *   # Register to a specific guild instantly (set DISCORD_GUILD_ID):
 *   DISCORD_GUILD_ID=123456789 node src/scripts/registerCommands.js
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

const TOKEN     = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID  = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  logger.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set');
  process.exit(1);
}

// Collect all command definitions.
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

const commands = commandFiles.map((file) => {
  const command = require(path.join(commandsPath, file));
  return command.data.toJSON();
});

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    logger.info(`Registering ${commands.length} slash command(s)…`);

    let route;
    if (GUILD_ID) {
      route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
      logger.info('Deploying to guild (instant)', { guildId: GUILD_ID });
    } else {
      route = Routes.applicationCommands(CLIENT_ID);
      logger.info('Deploying globally (may take up to 1 hour)');
    }

    const data = await rest.put(route, { body: commands });
    logger.info(`Successfully registered ${data.length} command(s)`);
  } catch (err) {
    logger.error('Failed to register commands', { message: err.message });
    process.exit(1);
  }
})();
