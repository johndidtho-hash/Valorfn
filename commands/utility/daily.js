const { SlashCommandBuilder } = require('discord.js');
const DailyChallengeService = require('../../services/daily-challenge-service');
const { createInfoEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('View or claim daily challenge')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('What to do')
                .setRequired(false)
                .addChoices(
                    { name: '👀 View Challenge', value: 'view' },
                    { name: '✅ Claim Reward', value: 'claim' }
                )),

    async execute(interaction, client) {
        const action = interaction.options.getString('action') || 'view';
        const service = new DailyChallengeService(client);

        try {
            if (action === 'view') {
                const challenge = await service.getCurrentChallenge();
                
                if (!challenge) {
                    return interaction.reply({
                        embeds: [createErrorEmbed('No Challenge', 'No active daily challenge found.')],
                        ephemeral: true
                    });
                }

                const embed = createInfoEmbed('🎯 Daily Challenge', `**${challenge.description}**`)
                    .addFields(
                        { name: '🎁 Reward', value: `${challenge.reward_amount} invites`, inline: true },
                        { name: '⏰ Status', value: 'Active', inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            } else if (action === 'claim') {
                const result = await service.claimChallenge(interaction.user.id);

                if (result.success) {
                    const embed = createSuccessEmbed(
                        '✅ Challenge Completed!',
                        `**Challenge:** ${result.description}\n**Reward:** ${result.reward} invites`
                    );
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    await interaction.reply({
                        embeds: [createErrorEmbed('Cannot Claim', result.error)],
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            logger.error('Daily command error:', error);
            await interaction.reply({
                content: 'An error occurred. Please try again.',
                ephemeral: true
            });
        }
    }
};
