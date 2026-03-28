const { SlashCommandBuilder } = require('discord.js');
const aiService = require('../../services/openai-service');
const fortniteAPI = require('../../services/fortnite-api');
const { createAIAnalysisEmbed, createErrorEmbed } = require('../../utils/embeds');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-analysis')
        .setDescription('Get AI-powered Fortnite coaching and insights (Premium/Elite only)')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Epic username to analyze (defaults to linked account)')
                .setRequired(false)),

    async execute(interaction) {
        // Check if user has premium or elite role
        const member = interaction.member;
        const hasAccess = member.roles.cache.has(config.roles.premium) || 
                         member.roles.cache.has(config.roles.elite);
        
        if (!hasAccess) {
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Premium Required', 
                    'This command requires ⭐ Premium or 👑 Elite tier.\nUse `/claim` to unlock with invites or `/membership` for purchase options.'
                )],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            
            // If no username provided, try to use linked account
            let stats;
            if (username) {
                const response = await fortniteAPI.getStats(username);
                stats = response.data?.stats?.all?.overall;
            } else {
                // Get linked account from database
                const { getDb } = require('../../database/connection');
                const db = getDb();
                const user = db.prepare('SELECT epic_username FROM users WHERE discord_id = ?').get(interaction.user.id);
                
                if (!user?.epic_username) {
                    return interaction.editReply({
                        embeds: [createErrorEmbed(
                            'No Linked Account', 
                            'Please provide a username or link your Epic account first.'
                        )]
                    });
                }
                
                const response = await fortniteAPI.getStats(user.epic_username);
                stats = response.data?.stats?.all?.overall;
            }

            if (!stats) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('No Stats', 'Could not retrieve stats for analysis.')]
                });
            }

            const analysis = await aiService.analyzeFortniteStats(stats);
            const embed = createAIAnalysisEmbed(analysis);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('AI analysis error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Analysis Failed', 'Could not generate AI analysis. Please try again later.')]
            });
        }
    }
};
