const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fortniteAPI = require('./fortnite-api');
const config = require('../config');
const logger = require('../utils/logger');

class NewsService {
    constructor(client) {
        this.client = client;
        this.lastChecked = {};
    }

    async checkForUpdates() {
        try {
            await this.checkBRNews();
            await this.checkSTWNews();
            await this.checkCreativeNews();
            await this.checkShopUpdate();
        } catch (error) {
            logger.error('News check error:', error);
        }
    }

    async checkBRNews() {
        try {
            const response = await fortniteAPI.getBRNews();
            if (!response.data?.motds?.length) return;

            const motd = response.data.motds[0];
            const key = `br_${motd.title}`;
            
            if (this.lastChecked[key]) return;
            this.lastChecked[key] = Date.now();

            const channel = await this.client.channels.fetch(config.channels.fortniteNews);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle(`📰 ${motd.title}`)
                .setDescription(motd.body)
                .setImage(motd.image)
                .setFooter({ text: 'Battle Royale News' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            logger.info('Posted BR news update');
        } catch (error) {
            logger.error('BR news check error:', error);
        }
    }

    async checkSTWNews() {
        try {
            const response = await fortniteAPI.getSTWNews();
            if (!response.data?.messages?.length) return;

            const message = response.data.messages[0];
            const key = `stw_${message.title}`;
            
            if (this.lastChecked[key]) return;
            this.lastChecked[key] = Date.now();

            const channel = await this.client.channels.fetch(config.channels.fortniteNews);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(0x27AE60)
                .setTitle(`🧟 ${message.title}`)
                .setDescription(message.body)
                .setImage(message.image)
                .setFooter({ text: 'Save the World News' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('STW news check error:', error);
        }
    }

    async checkCreativeNews() {
        try {
            const response = await fortniteAPI.getCreativeNews();
            if (!response.data?.motds?.length) return;

            const motd = response.data.motds[0];
            const key = `creative_${motd.title}`;
            
            if (this.lastChecked[key]) return;
            this.lastChecked[key] = Date.now();

            const channel = await this.client.channels.fetch(config.channels.fortniteNews);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(0xF39C12)
                .setTitle(`🎨 ${motd.title}`)
                .setDescription(motd.body)
                .setImage(motd.image)
                .setFooter({ text: 'Creative News' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('Creative news check error:', error);
        }
    }

    async checkShopUpdate() {
        try {
            const response = await fortniteAPI.getShop();
            if (!response.data) return;

            const date = new Date().toDateString();
            const key = `shop_${date}`;
            
            if (this.lastChecked[key]) return;
            this.lastChecked[key] = Date.now();

            const channel = await this.client.channels.fetch(config.channels.fortniteNews);
            if (!channel) return;

            const featured = response.data.featured?.entries || [];
            const daily = response.data.daily?.entries || [];

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle('🛒 Item Shop Updated!')
                .setDescription(
                    `**Featured Items:** ${featured.length}\n` +
                    `**Daily Items:** ${daily.length}\n\n` +
                    `Use "/shop" to see full details!`
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error('Shop check error:', error);
        }
    }
}

module.exports = NewsService;
