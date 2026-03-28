const { EmbedBuilder } = require('discord.js');

function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createInfoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createWarningEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createFortniteEmbed(title, description, rarity = 'common') {
    const rarityColors = {
        common: 0xB1B1B1,
        uncommon: 0x00FF00,
        rare: 0x0080FF,
        epic: 0xA335EE,
        legendary: 0xFF8000,
        mythic: 0xFFD700,
        exotic: 0x00FFFF,
        icon_series: 0xFF1493,
        marvel: 0xED1C24,
        dc: 0x0078D7,
        dark: 0x4B0082,
        frozen: 0x00CED1,
        lava: 0xFF4500,
        shadow: 0x2F2F2F,
        slurp: 0x00FFBF,
        star_wars: 0x000000
    };
    
    return new EmbedBuilder()
        .setColor(rarityColors[rarity] || rarityColors.common)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

function createStatsEmbed(username, stats, platform = 'all') {
    const kd = stats.kd || 0;
    const winRate = stats.winRate || 0;
    
    let color = 0xFF0000;
    if (kd >= 2.0) color = 0x00FF00;
    else if (kd >= 1.0) color = 0xFFA500;
    else if (kd >= 0.5) color = 0xFFFF00;
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`📊 ${username}'s Stats`)
        .setThumbnail('https://fortnite-api.com/images/logo.png')
        .addFields(
            { name: '🏆 Wins', value: stats.wins?.toString() || '0', inline: true },
            { name: '🎯 K/D', value: kd.toFixed(2), inline: true },
            { name: '📈 Win Rate', value: `${winRate.toFixed(1)}%`, inline: true },
            { name: '🎮 Matches', value: stats.matches?.toString() || '0', inline: true },
            { name: '💀 Kills', value: stats.kills?.toString() || '0', inline: true },
            { name: '⬆️ Top 10', value: stats.top10?.toString() || '0', inline: true }
        )
        .setFooter({ text: `Platform: ${platform.toUpperCase()} | Last Updated` })
        .setTimestamp();
    
    return embed;
}

function createShopEmbed(items, page = 1, totalPages = 1) {
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🛒 Fortnite Item Shop')
        .setDescription(`Page ${page} of ${totalPages}`)
        .setImage(items[0]?.image || null)
        .setTimestamp();
    
    items.slice(0, 10).forEach(item => {
        const rarity = item.rarity?.displayValue || 'Common';
        const price = item.price || '??';
        embed.addFields({
            name: `${item.name} (${rarity})`,
            value: `💰 ${price} V-Bucks`,
            inline: true
        });
    });
    
    return embed;
}

function createCosmeticEmbed(cosmetic) {
    const rarityColors = {
        common: 0xB1B1B1,
        uncommon: 0x00FF00,
        rare: 0x0080FF,
        epic: 0xA335EE,
        legendary: 0xFF8000,
        mythic: 0xFFD700,
        exotic: 0x00FFFF
    };
    
    const embed = new EmbedBuilder()
        .setColor(rarityColors[cosmetic.rarity?.value] || 0xB1B1B1)
        .setTitle(`${cosmetic.name} ${cosmetic.type?.displayValue || ''}`)
        .setDescription(cosmetic.description || 'No description available')
        .setImage(cosmetic.images?.icon || cosmetic.images?.featured)
        .addFields(
            { name: 'Rarity', value: cosmetic.rarity?.displayValue || 'Common', inline: true },
            { name: 'Series', value: cosmetic.series?.name || 'None', inline: true },
            { name: 'Set', value: cosmetic.set?.name || 'None', inline: true }
        )
        .setFooter({ text: `ID: ${cosmetic.id}` })
        .setTimestamp();
    
    return embed;
}

function createLockerEmbed(user, cosmetics, page, totalPages, maxSlots) {
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`🎒 ${user.username}'s Locker`)
        .setDescription(`Slots: ${cosmetics.length}/${maxSlots} | Page ${page}/${totalPages}`)
        .setTimestamp();
    
    cosmetics.forEach((item, index) => {
        const rarity = item.rarity?.value || 'common';
        const rarityEmojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟠',
            mythic: '🟡'
        };
        
        embed.addFields({
            name: `${rarityEmojis[rarity] || '⚪'} ${item.name}`,
            value: `${item.type?.displayValue || 'Cosmetic'} • ${item.rarity?.displayValue || 'Common'}`,
            inline: true
        });
    });
    
    return embed;
}

function createLeaderboardEmbed(title, users, type = 'invites') {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`🏆 ${title}`)
        .setTimestamp();
    
    let description = '';
    users.forEach((user, index) => {
        const medal = medals[index] || `${index + 1}.`;
        const value = type === 'invites' ? user.invites : user.activity_points;
        const label = type === 'invites' ? 'invites' : 'points';
        description += `${medal} <@${user.discord_id}> - **${value}** ${label}\n`;
    });
    
    embed.setDescription(description || 'No data available');
    
    return embed;
}

function createGiveawayEmbed(giveaway, entries = []) {
    const endsAt = new Date(giveaway.ends_at * 1000);
    const timeLeft = Math.floor((endsAt - Date.now()) / 1000);
    
    let timeString;
    if (timeLeft < 0) {
        timeString = 'Ended';
    } else if (timeLeft < 3600) {
        timeString = `${Math.floor(timeLeft / 60)} minutes`;
    } else if (timeLeft < 86400) {
        timeString = `${Math.floor(timeLeft / 3600)} hours`;
    } else {
        timeString = `${Math.floor(timeLeft / 86400)} days`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎉 GIVEAWAY!')
        .setDescription(`**Prize:** ${giveaway.prize}`)
        .addFields(
            { name: '⏰ Ends In', value: timeString, inline: true },
            { name: '🎁 Winners', value: giveaway.winner_count.toString(), inline: true },
            { name: '👥 Entries', value: entries.length.toString(), inline: true }
        )
        .setFooter({ text: `Cost: ${giveaway.invite_cost} invites | Click below to enter!` })
        .setTimestamp();
    
    return embed;
}

function createMembershipEmbed() {
    return new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('💎 ValorFN Membership Tiers')
        .setDescription('Upgrade your experience with exclusive perks!')
        .addFields(
            {
                name: '⭐ Premium Tier',
                value: `**Cost:** 35 invites OR $4.99/mo OR $39.99/yr\n` +
                       `**Perks:**\n` +
                       `• 25 Locker Slots\n` +
                       `• Advanced AI Analysis\n` +
                       `• Custom Profile Themes\n` +
                       `• Priority Support\n` +
                       `• Premium Commands Access`,
                inline: false
            },
            {
                name: '👑 Elite Tier',
                value: `**Cost:** 100 invites OR $9.99/mo OR $79.99/yr OR $199.99 Lifetime\n` +
                       `**Perks:**\n` +
                       `• Everything in Premium\n` +
                       `• 100 Locker Slots\n` +
                       `• Custom Themes & Highlight Cards\n` +
                       `• Exclusive Commands\n` +
                       `• Lifetime Option Available`,
                inline: false
            },
            {
                name: '📞 How to Purchase',
                value: 'Use `/claim` to spend invites\nClick the button below to open a ticket for paid membership',
                inline: false
            }
        )
        .setFooter({ text: 'ValorFN - Elevate Your Fortnite Experience' })
        .setTimestamp();
}

function createWelcomeEmbed(member, inviter, inviteCount) {
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`👋 Welcome to ValorFN, ${member.user.username}!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
            `Thanks for joining our Fortnite community!\n\n` +
            `**Invited by:** ${inviter ? `<@${inviter.id}>` : 'Unknown'}\n` +
            `${inviter ? `**Their Total Invites:** ${inviteCount}` : ''}\n\n` +
            `🔗 **Link your Epic account** for full access!\n` +
            `💎 **Invite friends** to unlock Premium/Elite!\n\n` +
            `Use "/help" to see all commands.`
        )
        .setFooter({ text: `Member #${member.guild.memberCount}` })
        .setTimestamp();
    
    return embed;
}

function createAIAnalysisEmbed(analysis) {
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🤖 AI Fortnite Analysis')
        .setDescription('Personalized insights based on your stats')
        .addFields(
            { name: '📊 Performance Score', value: `${analysis.score}/100`, inline: true },
            { name: '💪 Strengths', value: analysis.strengths.join('\n') || 'N/A', inline: false },
            { name: '📈 Areas to Improve', value: analysis.improvements.join('\n') || 'N/A', inline: false },
            { name: '🎯 Recommendations', value: analysis.recommendations.join('\n') || 'N/A', inline: false }
        )
        .setFooter({ text: 'Powered by OpenAI' })
        .setTimestamp();
    
    return embed;
}

module.exports = {
    createSuccessEmbed,
    createErrorEmbed,
    createInfoEmbed,
    createWarningEmbed,
    createFortniteEmbed,
    createStatsEmbed,
    createShopEmbed,
    createCosmeticEmbed,
    createLockerEmbed,
    createLeaderboardEmbed,
    createGiveawayEmbed,
    createMembershipEmbed,
    createWelcomeEmbed,
    createAIAnalysisEmbed
};
