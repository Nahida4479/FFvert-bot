import 'dotenv/config';
import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
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


client.login(process.env.BOT_TOKEN);    