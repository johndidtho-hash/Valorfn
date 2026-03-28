const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available commands and their usage'),

    async execute(interaction) {
        const hasPremium = interaction.member.roles.cache.has(config.roles.premium) || 
                          interaction.member.roles.cache.has(config.roles.elite);
        const isOwner = interaction.user.id === config.discord.ownerId;

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('📚 ValorFN Bot Commands')
            .setDescription('Your ultimate Fortnite companion! Here are all available commands:')
            .setFooter({ text: 'Use /membership to view premium tiers and perks' });

        // Free Commands
        embed.addFields({
            name: '🆓 Free Commands',
            value: 
                '`/stats <username>` - View Fortnite BR stats\n' +
                '`/compare <user1> <user2>` - Compare two players\n' +
                '`/skin <name>` - Search cosmetics\n' +
                '`/shop` - View current item shop\n' +
                '`/randomskin` - Get a random cosmetic\n' +
                '`/invites [@user]` - Check invite count\n' +
                '`/leaderboard [type]` - View leaderboards\n' +
                '`/daily [action]` - View or claim daily challenge',
            inline: false
        });

        // Linked Commands (for users with Linked role)
        embed.addFields({
            name: '🔗 Linked Account Commands',
            value: 
                '`/locker view` - View your cosmetic locker\n' +
                '`/locker add <name>` - Add cosmetic to locker\n' +
                '`/locker remove <name>` - Remove from locker\n' +
                '`/flex` - Generate profile card',
            inline: false
        });

        // Premium Commands
        if (hasPremium) {
            embed.addFields({
                name: '💎 Premium Commands',
                value: 
                    '`/ai-analysis [username]` - AI coaching and insights\n' +
                    '`/claim <tier>` - Spend invites for Premium/Elite',
                inline: false
            });
        } else {
            embed.addFields({
                name: '💎 Premium Commands (Locked)',
                value: 'Unlock with `/claim` or `/membership` for paid options',
                inline: false
            });
        }

        // Owner Commands
        if (isOwner) {
            embed.addFields({
                name: '👑 Owner Commands',
                value: 
                    '`/purge <amount>` - Delete messages\n' +
                    '`/snipe [user]` - View deleted messages\n' +
                    '`/giveaway` - Host a giveaway',
                inline: false
            });
        }

        // Quick Info
        embed.addFields({
            name: '📈 Quick Info',
            value: 
                `**Premium Cost:** ${config.invites.premiumCost} invites OR $${config.pricing.premiumMonthly}/mo\n` +
                `**Elite Cost:** ${config.invites.eliteCost} invites OR $${config.pricing.eliteMonthly}/mo\n` +
                `**Anti-Cheat:** Accounts must be 14+ days old to count for invites`,
            inline: false
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
