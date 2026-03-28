# ValorFN

A Discord bot that integrates with Epic Games OAuth and the Fortnite API, allowing users to link their Epic Games accounts and retrieve Fortnite statistics through Discord slash commands.

---

## Features

- 🔗 **Epic Games OAuth** — link your Epic Games account securely via `/link`
- 🎮 **Fortnite Stats** — view lifetime Battle Royale stats with `/stats`
- 🛒 **Item Shop** — browse today's item shop with `/shop`
- 👤 **Profile** — view your linked account details with `/profile`
- 🔒 **Encrypted token storage** — OAuth tokens are AES-256-GCM encrypted at rest

---

## Project Structure

```
src/
├── index.js                  # Main entry point (Discord bot + Express server)
├── commands/                 # Discord slash command handlers
│   ├── help.js
│   ├── link.js
│   ├── unlink.js
│   ├── profile.js
│   ├── stats.js
│   └── shop.js
├── events/                   # Discord.js event handlers
│   ├── ready.js
│   ├── interactionCreate.js
│   ├── guildCreate.js
│   └── error.js
├── services/                 # Business logic
│   ├── auth.js               # OAuth flow orchestration
│   ├── database.js           # All SQL queries
│   ├── epicOAuth.js          # Epic Games OAuth API calls
│   └── fortniteApi.js        # Fortnite stats API calls
├── utils/                    # Shared utilities
│   ├── apiRequest.js         # Axios wrapper with retry logic
│   ├── database.js           # SQLite connection + migrations
│   ├── encryption.js         # AES-256-GCM encrypt/decrypt
│   └── logger.js             # Structured JSON logger
└── scripts/
    └── registerCommands.js   # Slash command registration script
data/                         # SQLite database (auto-created, git-ignored)
```

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd valorfn
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in all required values
```

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from the [Discord Developer Portal](https://discord.com/developers/applications) |
| `DISCORD_CLIENT_ID` | Application ID from the Discord Developer Portal |
| `DISCORD_GUILD_ID` | *(Optional)* Guild ID for instant command registration during development |
| `EPIC_CLIENT_ID` | Client ID from the [Epic Games Developer Portal](https://dev.epicgames.com/portal) |
| `EPIC_CLIENT_SECRET` | Client secret from the Epic Games Developer Portal |
| `BASE_URL` | Public URL of this service (e.g. `https://valorfn.example.com`) — used as the OAuth redirect URI |
| `FORTNITE_API_KEY` | API key from [fortniteapi.io](https://fortniteapi.io) |
| `ENCRYPTION_KEY` | 64-character hex string (32 bytes) for AES-256 token encryption |
| `PORT` | HTTP server port (default: `3000`) |

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Register slash commands

```bash
# Register to a specific guild instantly (recommended for development):
node src/scripts/registerCommands.js

# Register globally (takes up to 1 hour to propagate):
# Unset DISCORD_GUILD_ID first, then run the same command.
```

### 4. Start the bot

```bash
npm start
```

---

## Epic Games OAuth Setup

1. Create an application at [dev.epicgames.com/portal](https://dev.epicgames.com/portal)
2. Add `<BASE_URL>/api/epic/callback` as an authorised redirect URI
3. Copy the Client ID and Client Secret into your `.env`

---

## Deployment on Railway

This project includes a `railway.toml` for zero-config Railway deployment.

1. Push this repository to GitHub
2. Create a new Railway project and connect the repo
3. Set all environment variables in the Railway dashboard
4. Railway will build and deploy automatically

The `/health` endpoint is used as the health check path.

---

## Development

```bash
npm run dev   # Start with nodemon (auto-restart on file changes)
```
