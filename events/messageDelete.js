const { Events } = require('discord.js');
const { run, all } = require('../database/connection');
const logger = require('../utils/logger');

module.exports = {
    name: Events.MessageDelete,
    async execute(message, client) {
        if (message.author?.bot) return;
        
        try {
            await run(
                `INSERT INTO deleted_messages (message_id, channel_id, user_id, content)
                VALUES (?, ?, ?, ?)`,
                [
                    message.id,
                    message.channelId,
                    message.author?.id,
                    message.content?.substring(0, 1000) || '[No content]'
                ]
            );

            // Keep only last 100 deleted messages per channel
            const messages = await all(
                `SELECT id FROM deleted_messages 
                WHERE channel_id = ? 
                ORDER BY deleted_at DESC 
                LIMIT 100`,
                [message.channelId]
            );
            
            if (messages.length === 100) {
                const idsToKeep = messages.map(m => m.id).join(',');
                await run(
                    `DELETE FROM deleted_messages 
                    WHERE channel_id = ? AND id NOT IN (${idsToKeep})`,
                    [message.channelId]
                );
            }
        } catch (error) {
            logger.error('Error storing deleted message:', error);
        }
    }
};
