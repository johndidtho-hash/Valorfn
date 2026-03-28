const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fortniteAPI = require('../../services/fortnite-api');
const { createErrorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

const CATEGORIES = {
    all: { label: 'All Items', emoji: '🛒' },
    outfit: { label: 'Skins', emoji: '👕' },
    emote: { label: 'Emotes', emoji: '💃' },
    pickaxe: { label: 'Pickaxes', emoji: '⛏️' },
    glider: { label: 'Gliders', emoji: '🪂' },
    backbling: { label: 'Back Blings', emoji: '🎒' },
    wrap: { label: 'Wraps', emoji: '🎨' }
};

const ITEMS_PER_PAGE = 6; // Show 6 items for cleaner layout

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View the current Fortnite Item Shop'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const response = await fortniteAPI.getShop();
            
            if (!response.data || !response.data.entries) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', 'Could not fetch item shop data.')]
                });
            }

            const entries = response.data.entries || [];
            const vbuckIcon = response.data.vbuckIcon;

            if (entries.length === 0) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Empty Shop', 'The item shop appears to be empty right now.')]
                });
            }

            // Debug first entry structure
            if (entries.length > 0) {
                console.log('[SHOP DEBUG] First entry full structure:', JSON.stringify(entries[0], null, 2).substring(0, 2000));
            }

            // Process items with clean names
            const items = entries.map((entry, index) => {
                // Clean up the name - remove [VIRTUAL]1 x and extract clean name
                let rawName = entry.devName || entry.title || 'Unknown Item';
                // Clean up the name - extract just the first cosmetic name
                let cleanName = rawName.replace(/\[VIRTUAL\]\d+\s*x\s*/g, '').split(',')[0].trim();
                // Remove "for X MtxCurrency" part
                cleanName = cleanName.replace(/\s+for\s+\d+\s*MtxCurrency.*$/i, '');
                
                // Try multiple image sources
                let imageUrl = null;
                
                // Source 1: newDisplayAsset.renderImages (NEW API STRUCTURE)
                if (entry.newDisplayAsset && entry.newDisplayAsset.renderImages && entry.newDisplayAsset.renderImages.length > 0) {
                    imageUrl = entry.newDisplayAsset.renderImages[0].image || null;
                }
                
                // Source 2: displayAssets
                if (!imageUrl && entry.displayAssets && entry.displayAssets.length > 0) {
                    imageUrl = entry.displayAssets[0].url || entry.displayAssets[0].image || entry.displayAssets[0].fullRender || null;
                }
                
                // Source 3: tileImage
                if (!imageUrl && entry.tileImage) {
                    imageUrl = entry.tileImage.url || null;
                }
                
                // Source 4: brItems array
                if (!imageUrl && entry.brItems && entry.brItems.length > 0) {
                    const firstItem = entry.brItems[0];
                    if (firstItem.images) {
                        imageUrl = firstItem.images.icon || firstItem.images.featured || firstItem.images.smallIcon || null;
                    }
                }
                
                console.log(`[SHOP DEBUG] Item ${index}:`, {
                    rawName: rawName.substring(0, 50),
                    cleanName: cleanName.substring(0, 50),
                    price: entry.finalPrice,
                    hasImage: !!imageUrl,
                    imageUrl: imageUrl ? imageUrl.substring(0, 100) : 'NONE'
                });
                
                // Extract item type from brItems for better categorization
                let itemType = 'other';
                if (entry.brItems && entry.brItems.length > 0) {
                    itemType = entry.brItems[0].type?.value || entry.brItems[0].type?.displayValue?.toLowerCase() || 'other';
                } else if (entry.mainType) {
                    itemType = entry.mainType.toLowerCase();
                } else if (entry.offerType) {
                    itemType = entry.offerType.toLowerCase();
                }
                
                return {
                    id: index,
                    name: cleanName,
                    description: entry.description || '',
                    price: entry.finalPrice || entry.regularPrice || '?',
                    rarity: entry.rarity?.name || 'Common',
                    type: entry.brItems?.[0]?.type?.displayValue || entry.mainType || entry.offerType || 'Item',
                    category: itemType,
                    image: imageUrl,
                    section: entry.section?.name || 'Featured'
                };
            }).filter(item => item.name !== 'Unknown Item' && item.price !== '?');

            if (items.length === 0) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Error', 'Could not parse shop items.')]
                });
            }

            // State management
            let currentCategory = 'all';
            let currentPage = 0;

            const generateEmbeds = () => {
                const filteredItems = currentCategory === 'all' 
                    ? items 
                    : items.filter(item => item.category === currentCategory);
                
                const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
                
                // Ensure current page is valid
                if (currentPage >= totalPages) currentPage = totalPages - 1;
                if (currentPage < 0) currentPage = 0;
                
                const pageItems = filteredItems.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

                // Main embed with title
                const mainEmbed = new EmbedBuilder()
                    .setColor(0x9B59B6) // Purple border
                    .setTitle(`${CATEGORIES[currentCategory].emoji} Fortnite Item Shop`)
                    .setDescription(
                        `**${filteredItems.length} items** in today's shop\n` +
                        `Page **${currentPage + 1}** of **${totalPages}**`
                    )
                    .setFooter({ text: `Shop updates daily at 00:00 UTC • Total: ${items.length} items`})
                    .setTimestamp();

                // Set V-Bucks icon as thumbnail on main embed
                if (vbuckIcon) {
                    mainEmbed.setThumbnail(vbuckIcon);
                }

                // Create individual embeds for each item with their image
                const itemEmbeds = pageItems.map((item, index) => {
                    const itemEmbed = new EmbedBuilder()
                        .setColor(0x9B59B6)
                        .setTitle(item.name.length > 80 ? item.name.substring(0, 77) + '...' : item.name)
                        .setDescription(`**${item.rarity}** ${item.type}\n💎 ${item.price} V-Bucks`);
                    
                    if (item.image) {
                        itemEmbed.setImage(item.image);
                    }
                    
                    return itemEmbed;
                });

                // Combine main embed with item embeds
                return { embeds: [mainEmbed, ...itemEmbeds], totalPages, filteredItems };
            };

            const generateButtons = (totalPages) => {
                const rows = [];

                // Category filter row 1
                const categoryRow1 = new ActionRowBuilder();
                ['all', 'outfit', 'emote', 'pickaxe'].forEach(key => {
                    categoryRow1.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`shop_cat_${key}`)
                            .setLabel(CATEGORIES[key].label)
                            .setEmoji(CATEGORIES[key].emoji)
                            .setStyle(currentCategory === key ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    );
                });
                rows.push(categoryRow1);

                // Category filter row 2
                const categoryRow2 = new ActionRowBuilder();
                ['glider', 'backbling', 'wrap'].forEach(key => {
                    categoryRow2.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`shop_cat_${key}`)
                            .setLabel(CATEGORIES[key].label)
                            .setEmoji(CATEGORIES[key].emoji)
                            .setStyle(currentCategory === key ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    );
                });
                rows.push(categoryRow2);

                // Navigation row
                const navRow = new ActionRowBuilder();
                navRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('shop_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0 || totalPages <= 1),
                    new ButtonBuilder()
                        .setCustomId('shop_page')
                        .setLabel(`Page ${currentPage + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('shop_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage >= totalPages - 1 || totalPages <= 1)
                );
                rows.push(navRow);

                return rows;
            };

            const { embeds, totalPages } = generateEmbeds();
            const buttons = generateButtons(totalPages);

            const message = await interaction.editReply({ 
                embeds: embeds, 
                components: buttons 
            });

            // Create collector for button interactions
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: 'Only the command user can use these buttons!', 
                        ephemeral: true 
                    });
                }

                const customId = i.customId;

                if (customId.startsWith('shop_cat_')) {
                    const newCategory = customId.replace('shop_cat_', '');
                    if (newCategory !== currentCategory) {
                        currentCategory = newCategory;
                        currentPage = 0;
                    }
                } else if (customId === 'shop_prev' && currentPage > 0) {
                    currentPage--;
                } else if (customId === 'shop_next') {
                    if (currentPage < totalPages - 1) currentPage++;
                }

                const { embeds: newEmbeds, totalPages: newTotal } = generateEmbeds();
                const newButtons = generateButtons(newTotal);

                await i.update({ 
                    embeds: newEmbeds, 
                    components: newButtons 
                });
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            logger.error('Shop command error:', error);
            await interaction.editReply({
                embeds: [createErrorEmbed('Error', 'Failed to fetch item shop. Please try again later.')]
            });
        }
    }
};
