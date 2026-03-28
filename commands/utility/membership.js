const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { createMembershipEmbed, createInfoEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membership')
        .setDescription('View membership tiers and perks'),

    async execute(interaction) {
        const embed = createMembershipEmbed();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('💬 Open Support Ticket')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel('📋 Full Features List')
                    .setURL('https://discord.gg/valorfn')
                    .setStyle(ButtonStyle.Link)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
