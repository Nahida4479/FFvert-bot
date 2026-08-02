import 'dotenv/config';
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import { error } from 'console';

const downloadsFolder = 'downloads/';

if (!fs.existsSync(downloadsFolder)) {
    try {
        fs.mkdirSync(downloadsFolder);
        console.log('Created folder:', downloadsFolder);
    } catch (error) {
        console.log('Could not create downloads folder. Check permissions.', error);
    }
}

const existingFiles = fs.readdirSync(downloadsFolder);
existingFiles.forEach(function(filename) {
    fs.unlink(downloadsFolder);
});
console.log('Cleaned up', existingFiles.length, 'old file from', downloadsFolder);



process.on('unhandledRejection', function(error){
    console.error("Unhandled promise rejection:", error)
});

process.on('uncaughtException', function(error) {
    console.error("Uncaught exception:", error);
});




const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async function() {
    console.log(`Logged in as ${client.user.tag}`);
    await client.application.commands.set([ConvertCommand]);
    console.log('Slash commands registered successfully');
});



// /convert
const ConvertCommand = new SlashCommandBuilder()
    .setName('convert')
    .setDescription('Convert an image or video to a different format')
    .addAttachmentOption(option =>
        option.setName('file')
            .setDescription("The image or video file to convert")
            .setRequired(true)  
    );



client.on('interactionCreate', async function(interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'convert') return;

    const attachment = interaction.options.getAttachment('file');
    console.log(attachment)
});


client.login(process.env.BOT_TOKEN);    