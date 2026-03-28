const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = require('./config');

const commands = [];

// Load commands from all subdirectories
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        
        if ('data' in command) {
            commands.push(command.data.toJSON());
            console.log(`Loaded command for deployment: ${command.data.name}`);
        } else {
            console.warn(`Command at ${filePath} is missing "data" property.`);
        }
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.discord.token);

// Deploy commands
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Deploy commands globally (takes up to 1 hour to propagate)
        const data = await rest.put(
            Routes.applicationCommands(config.discord.clientId),
            { body: commands }
        );

        console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
        console.log('Note: Global commands may take up to 1 hour to appear in all servers.');
    } catch (error) {
        console.error(error);
    }
})();
