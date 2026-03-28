const { Events, Collection, MessageFlags } = require('discord.js');
const { run, get } = require('../database/connection');
const inviteTracker = require('../services/invite-tracker');
const logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        console.log('[INTERACTION DEBUG] ========== INTERACTION RECEIVED ==========');
        console.log('[INTERACTION DEBUG] Type:', interaction.type);
        console.log('[INTERACTION DEBUG] User:', interaction.user?.tag);
        console.log('[INTERACTION DEBUG] Guild:', interaction.guild?.name);
        console.log('[INTERACTION DEBUG] Channel:', interaction.channel?.name);
        
        if (!interaction.isChatInputCommand() && !interaction.isButton()) {
            console.log('[INTERACTION DEBUG] Not a command or button, ignoring');
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            console.log('[INTERACTION DEBUG] Button clicked:', interaction.customId);
            await handleButton(interaction, client);
            return;
        }

        // Handle slash commands
        console.log('[INTERACTION DEBUG] Command:', interaction.commandName);
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.error('[INTERACTION DEBUG] Command not found:', interaction.commandName);
            return;
        }

        // Cooldown check
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                console.log('[INTERACTION DEBUG] User on cooldown');
                return await interaction.reply({ 
                    content: `Please wait, you are on cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        // Execute command
        console.log('[INTERACTION DEBUG] Executing command:', command.data.name);
        try {
            await command.execute(interaction, client);
            console.log('[INTERACTION DEBUG] Command executed successfully');
        } catch (error) {
            console.error(`[INTERACTION DEBUG] COMMAND ERROR: ${interaction.commandName}`);
            console.error('[INTERACTION DEBUG] Error:', error);
            if (error.stack) console.error('[INTERACTION DEBUG] Stack:', error.stack);
            
            const errorMessage = { 
                content: 'There was an error while executing this command!', 
                flags: [MessageFlags.Ephemeral]
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
        console.log('[INTERACTION DEBUG] ========== INTERACTION COMPLETED ==========');
    }
};

async function handleButton(interaction, client) {
    try {
        const { customId } = interaction;

        if (customId === 'claim_daily') {
            const DailyChallengeService = require('../services/daily-challenge-service');
            const service = new DailyChallengeService(client);
            const result = await service.claimChallenge(interaction.user.id);

            if (result.success) {
                await interaction.reply({
                    content: `✅ Challenge completed! You earned **${result.reward}** invites!`,
                    flags: [MessageFlags.Ephemeral]
                });
            } else {
                await interaction.reply({
                    content: `❌ ${result.error}`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        } else if (customId.startsWith('enter_giveaway_')) {
            const giveawayId = customId.replace('enter_giveaway_', '');
            
            try {
                // Get giveaway details
                const giveaway = await get('SELECT * FROM giveaways WHERE id = ?', [giveawayId]);
                
                if (!giveaway || !giveaway.is_active) {
                    return await interaction.reply({
                    content: '❌ This giveaway has ended.',
                    flags: [MessageFlags.Ephemeral]
                });
                }
                
                // Check if already entered
                const existing = await get(
                    'SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?',
                    [giveawayId, interaction.user.id]
                );
                
                if (existing) {
                    return await interaction.reply({
                        content: '❌ You have already entered this giveaway!',
                        flags: [MessageFlags.Ephemeral]
                    });
                }
                
                // Check invite cost
                if (giveaway.invite_cost > 0) {
                    const hasEnough = await inviteTracker.getInviteCount(interaction.user.id);
                    if (hasEnough < giveaway.invite_cost) {
                        return await interaction.reply({
                            content: `❌ You need ${giveaway.invite_cost} invites to enter. You have ${hasEnough}.`,
                            ephemeral: true
                        });
                    }
                    
                    // Deduct invites
                    const spent = await inviteTracker.spendInvites(interaction.user.id, giveaway.invite_cost);
                    if (!spent.success) {
                        return await interaction.reply({
                            content: `❌ ${spent.error}`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                }
                
                // Add entry
                await run(
                    'INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)',
                    [giveawayId, interaction.user.id]
                );
                
                await interaction.reply({
                    content: `✅ Successfully entered the giveaway for **${giveaway.prize}**!`,
                    ephemeral: true
                });
                
            } catch (error) {
                logger.error('Giveaway entry error:', error);
                await interaction.reply({
                    content: '❌ An error occurred while entering the giveaway.',
                    ephemeral: true
                });
            }
        } else if (customId === 'open_ticket') {
            // Handled in membership command
        }
    } catch (error) {
        console.error('[BUTTON ERROR]', error);
        if (error.stack) console.error(error.stack);
        await interaction.reply({
            content: 'An error occurred while processing your request.',
            flags: [MessageFlags.Ephemeral]
        });
    }
}
