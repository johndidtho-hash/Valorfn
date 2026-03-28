const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const inviteTracker = require('../../services/invite-tracker');
const { createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embeds');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Spend invites to claim Premium or Elite tier')
        .addStringOption(option =>
            option.setName('tier')
                .setDescription('Tier to claim')
                .setRequired(true)
                .addChoices(
                    { name: `⭐ Premium (${config.invites.premiumCost} invites)`, value: 'premium' },
                    { name: `👑 Elite (${config.invites.eliteCost} invites)`, value: 'elite' }
                )),

    async execute(interaction) {
        const tier = interaction.options.getString('tier');
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            const cost = tier === 'premium' ? config.invites.premiumCost : config.invites.eliteCost;
            const roleId = tier === 'premium' ? config.roles.premium : config.roles.elite;
            const role = guild.roles.cache.get(roleId);

            if (!role) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', 'Role not found. Contact an administrator.')],
                    ephemeral: true
                });
            }

            // Check if user already has the role
            if (member.roles.cache.has(roleId)) {
                return interaction.reply({
                    embeds: [createWarningEmbed('Already Claimed', `You already have the ${tier === 'premium' ? '⭐ Premium' : '👑 Elite'} role!`)],
                    ephemeral: true
                });
            }

            // Check invites
            const currentInvites = await inviteTracker.getInviteCount(interaction.user.id);
            if (currentInvites < cost) {
                return interaction.reply({
                    embeds: [createErrorEmbed(
                        'Not Enough Invites', 
                        `You need ${cost} invites to claim ${tier === 'premium' ? '⭐ Premium' : '👑 Elite'}.\nYou currently have ${currentInvites} invites.`
                    )],
                    ephemeral: true
                });
            }

            // Spend invites
            const result = await inviteTracker.spendInvites(interaction.user.id, cost);
            if (!result.success) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Error', result.error)],
                    ephemeral: true
                });
            }

            // Assign role
            await member.roles.add(role);

            // Update database
            const { getDb } = require('../../database/connection');
            const db = getDb();
            const now = Math.floor(Date.now() / 1000);
            
            if (tier === 'premium') {
                db.prepare('UPDATE users SET is_premium = 1, premium_since = ? WHERE discord_id = ?')
                    .run(now, interaction.user.id);
            } else {
                db.prepare('UPDATE users SET is_elite = 1, elite_since = ? WHERE discord_id = ?')
                    .run(now, interaction.user.id);
            }

            // Log the claim
            const modLog = require('../../services/mod-log-service');
            modLog.logRoleClaim(interaction.user.id, tier.toUpperCase(), 'INVITES');

            const embed = createSuccessEmbed(
                '🎉 Role Claimed!',
                `You have successfully claimed the ${tier === 'premium' ? '⭐ Premium' : '👑 Elite'} role!\n\n` +
                `**Invites Spent:** ${cost}\n` +
                `**Remaining Invites:** ${result.remaining}\n\n` +
                `Enjoy your new perks! Check them out with "/membership"`
            );

            await interaction.reply({ embeds: [embed] });
            
            logger.info(`${interaction.user.tag} claimed ${tier} role with ${cost} invites`);
        } catch (error) {
            logger.error('Claim error:', error);
            await interaction.reply({
                embeds: [createErrorEmbed('Error', 'Failed to process claim. Please try again.')],
                ephemeral: true
            });
        }
    }
};
