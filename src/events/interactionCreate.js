/**
 * Discord `interactionCreate` event — routes slash command interactions to
 * their respective command handlers.
 */

const { Events } = require('discord.js');
const { logCommand } = require('../services/database');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn('Unknown command received', { commandName: interaction.commandName });
      return interaction.reply({
        content: '❌ Unknown command.',
        ephemeral: true,
      });
    }

    // Fire-and-forget audit log.
    logCommand(
      interaction.user.id,
      interaction.commandName,
      interaction.guildId ?? null
    );

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error('Command execution error', {
        command: interaction.commandName,
        userId:  interaction.user.id,
        error:   err.message,
        stack:   err.stack,
      });

      const errorMessage = {
        content: '❌ An unexpected error occurred while running this command. Please try again later.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage).catch(() => {});
      } else {
        await interaction.reply(errorMessage).catch(() => {});
      }
    }
  },
};
