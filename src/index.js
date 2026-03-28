/**
 * ValorFN — main entry point.
 *
 * Responsibilities:
 *  1. Load environment variables from .env (if present)
 *  2. Initialise the SQLite database schema
 *  3. Load all Discord slash commands and event handlers
 *  4. Start the Express web server (handles Epic Games OAuth callbacks)
 *  5. Log the Discord bot in
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const express = require('express');
const cors    = require('cors');

const { getDatabase }        = require('./utils/database');
const { handleOAuthCallback } = require('./services/auth');
const logger                  = require('./utils/logger');

// ─── Validate required environment variables ──────────────────────────────────

const REQUIRED_ENV = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'ENCRYPTION_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error('Missing required environment variables', { missing });
  process.exit(1);
}

// ─── Discord client ───────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

/** @type {Collection<string, object>} */
client.commands = new Collection();

// ─── Load commands ────────────────────────────────────────────────────────────

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (!command.data || !command.execute) {
    logger.warn('Command file is missing data or execute export', { file });
    continue;
  }
  client.commands.set(command.data.name, command);
  logger.debug('Loaded command', { name: command.data.name });
}

logger.info(`Loaded ${client.commands.size} command(s)`);

// ─── Load events ──────────────────────────────────────────────────────────────

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (!event.name || !event.execute) {
    logger.warn('Event file is missing name or execute export', { file });
    continue;
  }

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }

  logger.debug('Registered event handler', { event: event.name, once: !!event.once });
}

logger.info(`Registered ${eventFiles.length} event handler(s)`);

// ─── Express web server ───────────────────────────────────────────────────────

const app  = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — used by Railway and other platforms to verify the service is up.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * Epic Games OAuth callback endpoint.
 *
 * Epic redirects here after the user authorises (or denies) the application.
 * Query params:
 *   code  — authorisation code to exchange for tokens
 *   state — CSRF state token generated during /link
 *   error — present if the user denied access
 */
app.get('/api/epic/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    logger.warn('Epic OAuth denied by user', { error });
    return res.status(400).send(renderPage(
      '❌ Authorisation Denied',
      'You denied access to your Epic Games account. You can try again with <code>/link</code> in Discord.',
      false
    ));
  }

  if (!code || !state) {
    return res.status(400).send(renderPage(
      '❌ Invalid Callback',
      'Missing required parameters. Please try the <code>/link</code> command again.',
      false
    ));
  }

  try {
    const { epicDisplayName } = await handleOAuthCallback(
      String(code),
      String(state)
    );

    logger.info('OAuth callback completed successfully');

    return res.send(renderPage(
      '✅ Account Linked!',
      `Your Epic Games account <strong>${epicDisplayName}</strong> has been successfully linked to ValorFN. ` +
      'You can now close this tab and return to Discord.',
      true
    ));
  } catch (err) {
    logger.error('OAuth callback error', { error: err.message });

    const isExpired = err.message.includes('expired') || err.message.includes('Invalid');
    return res.status(400).send(renderPage(
      '❌ Linking Failed',
      isExpired
        ? 'The authorisation link has expired. Please run <code>/link</code> again in Discord.'
        : 'An unexpected error occurred. Please try again later.',
      false
    ));
  }
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  // Initialise the database (runs migrations).
  await getDatabase();
  logger.info('Database initialised');

  // Start the HTTP server.
  app.listen(PORT, () => {
    logger.info(`Express server listening`, { port: PORT });
  });

  // Log the Discord bot in.
  await client.login(process.env.DISCORD_TOKEN);
}

start().catch((err) => {
  logger.error('Fatal startup error', { message: err.message, stack: err.stack });
  process.exit(1);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down gracefully');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

// ─── HTML helpers ─────────────────────────────────────────────────────────────

/**
 * Renders a minimal HTML page for the OAuth callback result.
 *
 * @param {string}  title
 * @param {string}  message  May contain safe HTML
 * @param {boolean} success
 * @returns {string}
 */
function renderPage(title, message, success) {
  const color = success ? '#00d4aa' : '#ff4444';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ValorFN</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #e6edf3;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 2.5rem 3rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; color: ${color}; margin-bottom: 1rem; }
    p  { line-height: 1.6; color: #8b949e; }
    code { background: #21262d; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '🎮' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
