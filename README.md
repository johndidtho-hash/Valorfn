# ValorFN Fortnite Companion Bot

A high-end, fully-featured Fortnite companion Discord bot with premium tiers, invite tracking, AI coaching, and comprehensive Fortnite integration.

## Features

### Core Systems
- **Invite Tracking** - Anti-cheat protected invite system with rewards
- **Premium Tiers** - Premium (35 invites/$4.99mo) & Elite (100 invites/$9.99mo or $199.99 lifetime)
- **Giveaways** - Invite-based entry system with automatic role rewards
- **AI Coaching** - Personalized gameplay analysis using OpenAI

### Fortnite Integration
- **Stats Tracking** - BR, STW, and Creative stats with comparisons
- **Cosmetics Database** - Full locker management with 10,000+ cosmetics
- **Item Shop** - Daily shop updates with auto-posting
- **News Feed** - Automatic patch notes and leak detection
- **Creator Codes** - Support-a-creator tracking

### Community Features
- **Leaderboards** - Top invites, stats, and activity tracking
- **Daily Challenges** - Gamified challenges with invite rewards
- **Profile Cards** - Customizable flex cards with cosmetics & stats
- **Skin Checker** - Full account locker visualization

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `.env` file with your credentials

3. Deploy slash commands:
```bash
npm run deploy
```

4. Start the bot:
```bash
npm start
```

## Commands

### Free Commands
- `/stats <username>` - View Fortnite stats
- `/compare <user1> <user2>` - Compare two players
- `/skin <name>` - Search cosmetics
- `/shop` - Current item shop
- `/randomskin` - Random cosmetic

### Linked Commands
- `/locker add <skin>` - Add to locker
- `/locker remove <skin>` - Remove from locker
- `/locker view` - View your locker
- `/flex` - Generate profile card

### Premium Commands
- `/ai-analysis` - Personalized coaching
- `/advanced-stats` - Deep stats analysis
- `/custom-theme` - Custom profile themes
- `/highlight-card` - Generate highlight reel

### Utility Commands
- `/invites [@user]` - Check invite count
- `/claim` - Claim Premium/Elite with invites
- `/membership` - View membership options
- `/leaderboard` - View top users
- `/daily` - Check daily challenge

### Moderation (Owner Only)
- `/purge <amount>` - Delete messages
- `/snipe @user` - View deleted messages
- `/giveaway` - Host giveaway

## Architecture

```
src/
├── index.js                 # Main entry point
├── deploy-commands.js       # Slash command deployment
├── config.js                # Configuration manager
├── database/
│   ├── connection.js        # Database setup
│   ├── models/
│   │   ├── User.js          # User data
│   │   ├── Invite.js        # Invite tracking
│   │   ├── Locker.js        # Cosmetic lockers
│   │   ├── Giveaway.js      # Giveaway data
│   │   └── Stats.js         # Fortnite stats cache
│   └── migrate.js           # Database migrations
├── services/
│   ├── fortnite-api.js      # Fortnite API client
│   ├── epic-oauth.js        # Epic Games OAuth
│   ├── openai-service.js    # AI coaching
│   ├── invite-tracker.js    # Invite system
│   └── news-service.js      # News auto-posting
├── commands/
│   ├── fortnite/            # Fortnite commands
│   ├── utility/             # Utility commands
│   ├── premium/             # Premium commands
│   └── moderation/          # Mod commands
├── events/
│   ├── guildMemberAdd.js    # Welcome & invite tracking
│   ├── guildMemberRemove.js # Leave tracking
│   ├── interactionCreate.js # Command handler
│   └── ready.js             # Bot startup
├── utils/
│   ├── embeds.js            # Embed builders
│   ├── rarities.js          # Rarity colors
│   ├── encryption.js        # Token encryption
│   └── validators.js        # Input validation
└── web/
    └── oauth-callback.js    # Epic OAuth callback
```

## License

MIT License - See LICENSE file for details
