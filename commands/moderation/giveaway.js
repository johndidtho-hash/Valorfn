const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { run, get, all } = require('../../database/connection');
const { createGiveawayEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const config = require('../../config');
const modLog = require('../../services/mod-log-service');
const inviteTracker = require('../../services/invite-tracker');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Host a giveaway (Owner only)')
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('What is the prize?')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in hours')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(168))
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10))
        .addIntegerOption(option =>
            option.setName('invite_cost')
                .setDescription('Invites required to enter (0 for free)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user is owner
        if (interaction.user.id !== config.discord.ownerId) {
            return interaction.reply({
                embeds: [createErrorEmbed('Unauthorized', 'Only the server owner can host giveaways.')],
                ephemeral: true
            });
        }

        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winners = interaction.options.getInteger('winners') || 1;
        const inviteCost = interaction.options.getInteger('invite_cost') || 0;

        try {
            const endsAt = Math.floor(Date.now() / 1000) + (duration * 3600);

            // Create giveaway in database
            const result = await run(
                `INSERT INTO giveaways (prize, winner_count, invite_cost, ends_at, created_by)
                VALUES (?, ?, ?, ?, ?)`,
                [prize, winners, inviteCost, endsAt, interaction.user.id]
            );
            const giveawayId = result.lastID;

            // Create giveaway message
            const giveawayData = {
                id: giveawayId,
                prize,
                winner_count: winners,
                invite_cost: inviteCost,
                ends_at: endsAt
            };

            const embed = createGiveawayEmbed(giveawayData, []);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`enter_giveaway_${giveawayId}`)
                        .setLabel(inviteCost > 0 ? `🎉 Enter (${inviteCost} invites)` : '🎉 Enter Giveaway')
                        .setStyle(ButtonStyle.Success)
                );

            const giveawayChannel = await interaction.client.channels.fetch(config.channels.giveaway);
            
            // Send @everyone ping first
            await giveawayChannel.send({ content: '@everyone 🎉 **NEW GIVEAWAY!** 🎉' });
            
            const message = await giveawayChannel.send({ embeds: [embed], components: [row] });

            // Update giveaway with message ID
            await run(
                'UPDATE giveaways SET message_id = ?, channel_id = ? WHERE id = ?',
                [message.id, giveawayChannel.id, giveawayId]
            );

            // Schedule giveaway end
            setTimeout(async () => {
                await endGiveaway(giveawayId, interaction.client);
            }, duration * 3600 * 1000);
            
            // Schedule 5 minute warning
            const fiveMinMs = (duration * 3600 - 300) * 1000;
            if (fiveMinMs > 0) {
                setTimeout(async () => {
                    try {
                        await giveawayChannel.send({ content: '@everyone ⏰ **5 minutes left!** Enter now!' });
                    } catch (e) {}
                }, fiveMinMs);
            }

            modLog.log('GIVEAWAY_START', {
                giveawayId,
                prize,
                winners,
                inviteCost,
                duration
            }, null, interaction.user.id);

            await interaction.reply({
                embeds: [createSuccessEmbed('Giveaway Started', `Giveaway posted in <#${config.channels.giveaway}>!`)],
                ephemeral: true
            });
        } catch (error) {
            logger.error('Giveaway error:', error);
            await interaction.reply({
                embeds: [createErrorEmbed('Error', 'Failed to start giveaway.')],
                ephemeral: true
            });
        }
    }
};

async function endGiveaway(giveawayId, client) {
    try {
        const giveaway = await get('SELECT * FROM giveaways WHERE id = ?', [giveawayId]);
        
        if (!giveaway || !giveaway.is_active) return;

        // Get entries
        const entries = await all('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?', [giveawayId]);
        
        if (entries.length === 0) {
            // No entries, cancel giveaway
            await run('UPDATE giveaways SET is_active = 0 WHERE id = ?', [giveawayId]);
            return;
        }

        // Select winners
        const winners = [];
        const entriesCopy = [...entries];
        
        for (let i = 0; i < Math.min(giveaway.winner_count, entriesCopy.length); i++) {
            const randomIndex = Math.floor(Math.random() * entriesCopy.length);
            winners.push(entriesCopy.splice(randomIndex, 1)[0]);
        }

        // Announce winners
        const channel = await client.channels.fetch(giveaway.channel_id);
        const winnerMentions = winners.map(w => `<@${w.user_id}>`).join(', ');
        
        await channel.send({
            content: `🎉 **Giveaway Ended!** 🎉\n\n**Prize:** ${giveaway.prize}\n**Winners:** ${winnerMentions}\n\nCongratulations! Please contact staff to claim your prize.`,
            allowedMentions: { users: winners.map(w => w.user_id) }
        });

        // Mark as ended
        await run('UPDATE giveaways SET is_active = 0 WHERE id = ?', [giveawayId]);

        // Log winners
        winners.forEach(w => {
            modLog.logGiveawayWinner(giveawayId, w.user_id, giveaway.prize);
        });

        logger.info(`Giveaway ${giveawayId} ended with ${winners.length} winners`);
    } catch (error) {
        logger.error('Error ending giveaway:', error);
    }
}
