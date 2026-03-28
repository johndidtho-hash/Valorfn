const { Events } = require('discord.js');
const config = require('../config');
const inviteTracker = require('../services/invite-tracker');
const { createWelcomeEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        console.log('[WELCOME DEBUG] ========== MEMBER JOINED ==========');
        console.log('[WELCOME DEBUG] Member:', member.user.tag);
        console.log('[WELCOME DEBUG] Guild:', member.guild.name);
        console.log('[WELCOME DEBUG] Guild ID:', member.guild.id);
        console.log('[WELCOME DEBUG] Config Server ID:', config.discord.serverId);
        
        try {
            // Only process for the configured server
            if (member.guild.id !== config.discord.serverId) {
                console.log('[WELCOME DEBUG] Wrong server, skipping');
                return;
            }

            console.log('[WELCOME DEBUG] Correct server, processing invite tracking...');

            // Fetch invites to find who invited this member
            console.log('[WELCOME DEBUG] Fetching invites...');
            const newInvites = await member.guild.invites.fetch();
            console.log('[WELCOME DEBUG] New invites count:', newInvites.size);
            
            const oldInvites = client.invites?.get(member.guild.id) || new Map();
            console.log('[WELCOME DEBUG] Old invites count:', oldInvites.size);
            
            let usedInvite = null;
            
            for (const [code, invite] of newInvites) {
                const oldInvite = oldInvites.get(code);
                if (oldInvite && invite.uses > oldInvite.uses) {
                    usedInvite = invite;
                    console.log('[WELCOME DEBUG] Found used invite (increased uses):', code);
                    break;
                }
                if (!oldInvite && invite.uses > 0) {
                    usedInvite = invite;
                    console.log('[WELCOME DEBUG] Found used invite (new):', code);
                    break;
                }
            }

            if (!usedInvite) {
                console.log('[WELCOME DEBUG] No used invite found');
            } else {
                console.log('[WELCOME DEBUG] Inviter:', usedInvite.inviter?.tag || 'Unknown');
                console.log('[WELCOME DEBUG] Inviter ID:', usedInvite.inviter?.id);
            }

            // Update invite cache
            const inviteMap = new Map();
            newInvites.forEach(invite => inviteMap.set(invite.code, invite));
            client.invites = client.invites || new Map();
            client.invites.set(member.guild.id, inviteMap);
            console.log('[WELCOME DEBUG] Invite cache updated');

            // Track the join
            console.log('[WELCOME DEBUG] Calling inviteTracker.trackJoin...');
            const inviterId = await inviteTracker.trackJoin(member.guild, member, usedInvite);
            console.log('[WELCOME DEBUG] trackJoin returned:', inviterId);
            
            // Assign default role
            console.log('[WELCOME DEBUG] Assigning member role...');
            const memberRole = member.guild.roles.cache.get(config.roles.members);
            if (memberRole) {
                await member.roles.add(memberRole).catch(e => console.error('[WELCOME DEBUG] Role add error:', e));
                console.log('[WELCOME DEBUG] Member role assigned');
            } else {
                console.log('[WELCOME DEBUG] Member role not found in cache');
            }

            // Send welcome message
            console.log('[WELCOME DEBUG] Fetching welcome channel:', config.channels.welcome);
            const welcomeChannel = await client.channels.fetch(config.channels.welcome);
            console.log('[WELCOME DEBUG] Welcome channel found:', !!welcomeChannel);
            
            if (welcomeChannel) {
                const inviteCount = inviterId ? await inviteTracker.getInviteCount(inviterId) : 0;
                console.log('[WELCOME DEBUG] Inviter invite count:', inviteCount);
                
                const inviter = inviterId ? await client.users.fetch(inviterId) : null;
                console.log('[WELCOME DEBUG] Inviter user:', inviter?.tag);
                
                const embed = createWelcomeEmbed(member, inviter, inviteCount);
                console.log('[WELCOME DEBUG] Sending welcome embed...');
                await welcomeChannel.send({ embeds: [embed] });
                console.log('[WELCOME DEBUG] Welcome message sent');
            } else {
                console.error('[WELCOME DEBUG] Welcome channel not found!');
            }

            logger.info(`Member joined: ${member.user.tag}, invited by: ${inviterId || 'unknown'}`);
            console.log('[WELCOME DEBUG] ========== MEMBER JOIN COMPLETED ==========');
        } catch (error) {
            console.error('[WELCOME DEBUG] ERROR in guildMemberAdd:', error);
            if (error.stack) console.error('[WELCOME DEBUG] Stack:', error.stack);
            logger.error('Error in guildMemberAdd event:', error);
        }
    }
};
