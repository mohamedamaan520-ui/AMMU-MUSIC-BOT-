# AMMU MUSIC BOT 🎵

A WhatsApp song-search bot built with Cloudflare Workers and the WhatsApp Cloud API.

## Current features

- WhatsApp webhook verification and incoming-message handling.
- Search Tamil, Sinhala and English music metadata.
- Song title, artist, album, release date and genre.
- Album artwork image response.
- `/help`, `/about`, `/song <name>`, and plain song-name search.
- No API keys or access tokens are stored in source code.

## Important audio note

This starter searches song metadata and artwork. It does not rip or download copyrighted music from YouTube or other services. Audio delivery can be added only for audio that you own or are authorized to distribute.

## Requirements

- A Cloudflare account.
- Node.js 20+ and npm.
- A WhatsApp Business Platform / Cloud API phone number.
- Meta WhatsApp access token and Phone Number ID.

Cloudflare and Meta usage limits, pricing, and eligibility may change. Check the current provider dashboards before production use.

## 1. Install

```bash
npm install
```

## 2. Add secrets

```bash
npx wrangler secret put VERIFY_TOKEN
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put PHONE_NUMBER_ID
```

Use a long random value for `VERIFY_TOKEN`. Never commit these values to GitHub.

## 3. Deploy

```bash
npx wrangler login
npm run deploy
```

Copy the deployed Worker URL, for example:

`https://ammu-music-bot.<your-subdomain>.workers.dev/webhook`

## 4. Configure Meta webhook

In the Meta developer dashboard, configure the WhatsApp webhook callback URL to the deployed `/webhook` URL. Use the exact same value you saved as `VERIFY_TOKEN` for the Verify Token field. Subscribe to the `messages` webhook field.

## 5. Test

Send `/help`, then try:

```text
/song Hukum Anirudh
```

The bot searches Apple's iTunes Search API for matching song metadata and artwork. Search results depend on catalog availability and regional metadata.

## Environment variables

| Name | Purpose |
| --- | --- |
| `VERIFY_TOKEN` | Meta webhook verification secret |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API access token |
| `PHONE_NUMBER_ID` | WhatsApp sender phone number ID |
| `GRAPH_API_VERSION` | Optional Graph API version; defaults to `v27.0` |

## Project structure

```text
AMMU-MUSIC-BOT/
├── src/
│   └── index.js
├── .gitignore
├── package.json
├── README.md
└── wrangler.toml
```
