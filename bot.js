import 'dotenv/config';
import { Client, GatewayIntentBits, SlashCommandBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs, { unlink } from 'fs';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from '@andrkrn/ffprobe-static';
import { exec, execFile, spawn } from 'child_process';
import { stdout } from 'process';
import { StringDecoder } from 'string_decoder';
import { error } from 'console';
import crypto from 'crypto';
import { Session } from 'inspector';

const downloadsFolder = 'downloads/';

const conversionSession = new Map();

function buildProgressBar(parcent) {
    const totalBars = 20;
    const filledBars = Math.round((parcent / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    return '`[' + '█'.repeat(filledBars) + '░'.repeat(emptyBars) + `] ${parcent.toFixed(1)}%\``
}

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
    fs.unlinkSync(downloadsFolder + filename);
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



function buildFormatSelect(formatslist) {
    const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('formatSelect')
    .setPlaceholder("Choose output format");

    formatslist.forEach(function(format) {
        selectMenu.addOptions({
            label: format.toUpperCase(),
            value: format
        })
    });
    return selectMenu;
}


client.on('interactionCreate', async function(interaction) {
    if (interaction.isChatInputCommand() && interaction.commandName === 'convert') {
        await interaction.deferReply();

    const attachment = interaction.options.getAttachment('file');
    console.log(attachment)

    const nameParts = attachment.name.split('.');
    const inputFileExtension = nameParts[nameParts.length -1];

    const response = await fetch(attachment.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const localFilePath = `downloads/${attachment.id}.${inputFileExtension}`;
    fs.writeFileSync(localFilePath, buffer);

    const isVideo = attachment.contentType.startsWith('video/');
    const isImage = attachment.contentType.startsWith('image/');

    const imageFormats = ['png', 'jpg', 'webp', 'bmp'];
    const videoFormats = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'gif'];


    let formatSelectMenu;

    if (isImage) {
        formatSelectMenu = buildFormatSelect(imageFormats);
    } else if (isVideo) {
        formatSelectMenu = buildFormatSelect(videoFormats);
    } else {
        await interaction.editReply({ content: 'Unsupported file type.', ephemeral: true});
        return;
    }

    const resolutionsOption = [
        { label: '4K', value: '3840x2160'},
        { label: '1440p', value: '2560x1440' },
        { label: '1080p', value: '1920x1080' },
        { label: '720p', value: '1280x720' },
        { label: '480p', value: '854x480' }
    ];

    const resolutionSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('resolutionSelect')
        .setPlaceholder('Choose output resolution')
        .addOptions(resolutionsOption);

    const convertButton = new ButtonBuilder()
        .setCustomId('convertButton')
        .setLabel('Convert')
        .setStyle(ButtonStyle.Primary);

    const formatRow = new ActionRowBuilder().addComponents(formatSelectMenu);
    const resolutionRow = new ActionRowBuilder().addComponents(resolutionSelectMenu);
    const buttonRow = new ActionRowBuilder().addComponents(convertButton);

    const convertEmbed = new EmbedBuilder()
        .setTitle("File Conversion")
        .setDescription('Choose the output format and resolution, then click Convert.')
        .setColor(0x800080)

await interaction.editReply({
    embeds: [convertEmbed],
    components: [formatRow, resolutionRow, buttonRow]

});

const sendMessage = await interaction.fetchReply();

conversionSession.set(sendMessage.id, {
    localFilePath: localFilePath,
    isImage: isImage,
    isVideo: isVideo,
    format: null,
    resolution: null
});

return;
    }
if (interaction.isStringSelectMenu()) {
    const session = conversionSession.get(interaction.message.id);

    if (interaction.customId === "formatSelect") {
        session.format = interaction.values[0];
    } else if (interaction.customId === 'resolutionSelect') {
        session.resolution = interaction.values[0];
    }

    await interaction.deferUpdate();
    return;
}

if (interaction.isButton() && interaction.customId === 'convertButton') {
    const session = conversionSession.get(interaction.message.id);

    if (!session.format || !session.resolution) {
        await interaction.reply({ content: "Please choose both a format and a resolution first.", ephemeral: true});
        return;
    }
    await interaction.message.edit({ components: [] });
    await interaction.reply({ content: "Converting...", ephemeral: true });

    console.log('Session data:', session);

    execFile(ffprobePath, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', session.localFilePath], function(error, stdout, stderr) {
        console.error(error);
        const probeData = JSON.parse(stdout);
        const originalWidth = probeData.streams[0].width;
        const originalHeight = probeData.streams[0].height;
        const videoDuration = Number(probeData.format.duration);
        const xdata = session.resolution.split('x');
        const selectedResolutionWidth = Number(xdata[xdata.length - 2]);
        const selectedResolutionHeight = Number(xdata[xdata.length - 1]);

        let finalWidth;
        let finalHeight;

        if (originalHeight > originalWidth) {
            finalWidth = selectedResolutionHeight
            finalHeight = selectedResolutionWidth 
        } else {
            finalHeight = selectedResolutionHeight;
            finalWidth = selectedResolutionWidth;
        }

        const cryptoSessionID = crypto.randomUUID();
        const outputFilePath = `downloads/output-${cryptoSessionID}.${session.format}`

        if (session.format === 'gif') {
            const palleteGifPath = `downloads/pallete-${cryptoSessionID}.png`;

            execFile(ffmpegPath, ['-i', session.localFilePath, '-vf', `scale=${finalWidth}:${finalHeight},palettegen`, palleteGifPath], function(error, stdout, stderr) {
                console.error(error);
                
                execFile(ffmpegPath, ['-i', session.localFilePath, '-i', palleteGifPath, '-filter_complex', `scale=${finalWidth}:${finalHeight}[x];[x][1:v]paletteuse`, outputFilePath], async function(error, stdout, stderr) {
                    console.error(error);
                    console.log("GIF conversion done");
                    const outputAttachmentGIF = new AttachmentBuilder(outputFilePath);
                    await interaction.channel.send({ content: "GIF conversion done!", files: [outputAttachmentGIF]});

                    fs.unlink(session.localFilePath, function(err) {
                        if (err) console.log("Failed to delete input file", err);
                    });

                    fs.unlink(palleteGifPath, function(err) {
                        if (err) console.log("Failed to delete pallete file", err);
                    });

                    setTimeout(function() {
                        fs.unlink(outputFilePath, function(err) {
                            if (err) console.log("Failed to delete output file", err);
                        });
                    }, 30000)
                });

            });
        } else {
            let lastUpdatedTime = 0;
            const FFmpegProcess = spawn(ffmpegPath, ['-i', session.localFilePath, '-vf', `scale=${finalWidth}:${finalHeight}`, outputFilePath]);
            FFmpegProcess.stderr.on('data', function(chunk) {
                console.log('CHUNK:', chunk.toString());
                const match = chunk.toString().match(/time=(\d+):(\d+):(\d+\.\d+)/);
                console.log('MATCH:', match);
                if (match) {
                    const currentSeconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
                    const percent = Math.min((currentSeconds / videoDuration) * 100, 100);

                    const now = Date.now();
                    if (now - lastUpdatedTime > 2000) {
                        lastUpdatedTime = now;
                        interaction.editReply({ content: buildProgressBar(percent) }).catch(function(err) {
                            console.log('EDIT REPLY ERROR:', err);
                        });
                    }
                }
            });

            FFmpegProcess.on('close', async function(code) {
                await interaction.editReply({ content: buildProgressBar(100) }).catch(function(err) {
                    console.log(err);
                });

                console.log('Conversion done');
                
                const outputAttachment = new AttachmentBuilder(outputFilePath);
                await interaction.channel.send({ content: "Conversion done", files: [outputAttachment]});

                fs.unlink(session.localFilePath, function(err) {
                    if (err) console.log("Failed to delete input file", err);
                });
                setTimeout(function() {
                    fs.unlink(outputFilePath, function(err){
                        if (err) console.log("Failed to delete output file", err);
                    });
                }, 30000)
            });
}   
    });
}
});


client.login(process.env.BOT_TOKEN);    