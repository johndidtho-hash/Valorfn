const { REST, Routes } = require('discord.js');
require('dotenv').config();

const config = require('./config');

// Test which deployment method works
async function testDeployment() {
    const rest = new REST().setToken(config.discord.token);
    
    console.log('Testing deployment options...\n');
    console.log('Client ID:', config.discord.clientId);
    console.log('Server ID:', config.discord.serverId);
    console.log('');
    
    // Test 1: Try to get existing guild commands
    try {
        console.log('Test 1: Checking existing guild commands...');
        const commands = await rest.get(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.serverId)
        );
        console.log(`✓ Found ${commands.length} existing guild commands`);
    } catch (error) {
        console.log(`✗ Failed to get guild commands: ${error.message}`);
        if (error.code === 50001) {
            console.log('  → Bot lacks "applications.commands" scope in this guild');
            console.log('  → Solution: Re-invite bot with scope=bot+applications.commands');
        }
    }
    
    // Test 2: Try to deploy ONE simple command
    console.log('\nTest 2: Deploying test command...');
    try {
        const testCommand = {
            name: 'test',
            description: 'Test command'
        };
        
        const result = await rest.post(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.serverId),
            { body: testCommand }
        );
        console.log('✓ Successfully deployed test command');
        
        // Clean up test command
        await rest.delete(
            Routes.applicationGuildCommand(config.discord.clientId, config.discord.serverId, result.id)
        );
        console.log('✓ Cleaned up test command');
    } catch (error) {
        console.log(`✗ Failed to deploy: ${error.message}`);
        console.log(`  Code: ${error.code}`);
        
        if (error.code === 50001) {
            console.log('\n🔴 SOLUTION NEEDED:');
            console.log('The bot was invited without "applications.commands" scope.');
            console.log('\nUse this URL to re-invite the bot:');
            const url = `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&scope=bot+applications.commands&permissions=8`;
            console.log(url);
            console.log('\nAfter re-inviting, run: npm run deploy');
        }
    }
}

testDeployment().catch(console.error);
