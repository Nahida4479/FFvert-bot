# FFvert-bot

[**Add FFvert-bot to your Discord server**](https://discord.com/oauth2/authorize?client_id=1533585312024887337&permissions=8&integration_type=0&scope=bot)

A Discord bot that converts images and videos to different formats using the `/convert` slash command.

## Features

- Detects whether you uploaded an image or a video, and shows only the matching output formats
- Keeps the original orientation (a portrait video stays portrait, a landscape video stays landscape)
- Live progress bar during conversion
- High-quality, two-pass GIF conversion with a custom color palette
- Automatic cleanup of temporary files

## Supported formats

| Type | Formats |
|---|---|
| Images | PNG, JPG, WEBP, BMP |
| Video | MP4, MOV, AVI, MKV, WMV, GIF |

## Installation

```bash
git clone https://github.com/Nahida4479/FFvert-bot.git
cd FFvert-bot
npm install
```

Create a `.env` file in the project folder with your bot token:

```
BOT_TOKEN=your_discord_bot_token_here
```

## Running the bot

```bash
node bot.js
```
