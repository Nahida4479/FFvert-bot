import 'dotenv/config';
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';

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