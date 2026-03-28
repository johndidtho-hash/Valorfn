const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_URL || './data/database.sqlite';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function init() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Database opening error:', err);
                reject(err);
            } else {
                console.log('Database connected');
                createTables().then(() => resolve(db)).catch(reject);
            }
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                discord_id TEXT UNIQUE NOT NULL,
                epic_id TEXT,
                epic_username TEXT,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at INTEGER,
                invites INTEGER DEFAULT 0,
                invite_code TEXT,
                joined_at INTEGER,
                is_linked INTEGER DEFAULT 0,
                is_premium INTEGER DEFAULT 0,
                is_elite INTEGER DEFAULT 0,
                premium_since INTEGER,
                elite_since INTEGER,
                premium_expires_at INTEGER,
                activity_points INTEGER DEFAULT 0,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`);

            // Invites tracking
            db.run(`CREATE TABLE IF NOT EXISTS invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                invited_user_id TEXT,
                invited_discord_id TEXT,
                invite_code TEXT NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                is_valid INTEGER DEFAULT 1
            )`);

            // User lockers
            db.run(`CREATE TABLE IF NOT EXISTS lockers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                cosmetic_id TEXT NOT NULL,
                cosmetic_type TEXT,
                added_at INTEGER DEFAULT (strftime('%s', 'now')),
                UNIQUE(user_id, cosmetic_id)
            )`);

            // Giveaways
            db.run(`CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT UNIQUE,
                channel_id TEXT NOT NULL,
                prize TEXT NOT NULL,
                winner_count INTEGER DEFAULT 1,
                invite_cost INTEGER DEFAULT 0,
                started_at INTEGER DEFAULT (strftime('%s', 'now')),
                ends_at INTEGER NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_by TEXT NOT NULL
            )`);

            // Giveaway entries
            db.run(`CREATE TABLE IF NOT EXISTS giveaway_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                giveaway_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                entered_at INTEGER DEFAULT (strftime('%s', 'now')),
                UNIQUE(giveaway_id, user_id)
            )`);

            // Stats cache
            db.run(`CREATE TABLE IF NOT EXISTS stats_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                epic_id TEXT NOT NULL,
                game_mode TEXT,
                stats_data TEXT,
                cached_at INTEGER DEFAULT (strftime('%s', 'now')),
                expires_at INTEGER,
                UNIQUE(epic_id, game_mode)
            )`);

            // Daily challenges
            db.run(`CREATE TABLE IF NOT EXISTS daily_challenges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                challenge_date TEXT UNIQUE,
                description TEXT NOT NULL,
                reward_type TEXT,
                reward_amount INTEGER,
                is_active INTEGER DEFAULT 1
            )`);

            // Challenge completions
            db.run(`CREATE TABLE IF NOT EXISTS challenge_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                challenge_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                completed_at INTEGER DEFAULT (strftime('%s', 'now')),
                reward_claimed INTEGER DEFAULT 0,
                UNIQUE(challenge_id, user_id)
            )`);

            // Fortnite news cache
            db.run(`CREATE TABLE IF NOT EXISTS news_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                news_type TEXT NOT NULL,
                title TEXT,
                content TEXT,
                image_url TEXT,
                posted_at INTEGER,
                is_posted INTEGER DEFAULT 0
            )`);

            // Mod log
            db.run(`CREATE TABLE IF NOT EXISTS mod_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                user_id TEXT,
                moderator_id TEXT,
                details TEXT,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`);

            // Deleted messages (for snipe)
            db.run(`CREATE TABLE IF NOT EXISTS deleted_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT,
                channel_id TEXT,
                user_id TEXT,
                content TEXT,
                deleted_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`);

            // Create indexes
            db.run(`CREATE INDEX IF NOT EXISTS idx_invites_user ON invites(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_lockers_user ON lockers(user_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_stats_epic ON stats_cache(epic_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_giveaway_entries ON giveaway_entries(giveaway_id)`);
        }, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function getDb() {
    return db;
}

// Promisified wrapper for sqlite3
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

module.exports = {
    init,
    getDb,
    get db() { return db; },
    run,
    get,
    all
};
