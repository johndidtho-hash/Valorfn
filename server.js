const express = require('express');
const { run } = require('./database/connection');
const EpicOAuthService = require('./services/epic-oauth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Epic Games OAuth callback
app.get('/api/epic/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    console.log('[OAUTH CALLBACK] Received request:', { code: !!code, state, error });
    
    if (error) {
        console.error('[OAUTH CALLBACK] Error:', error);
        return res.send(`
            <html>
                <body>
                    <h1>Authentication Failed</h1>
                    <p>Error: ${error}</p>
                    <p>You can close this window and return to Discord.</p>
                </body>
            </html>
        `);
    }
    
    try {
        // Parse state to get Discord user ID
        const [discordId] = state.split(':');
        
        // Link the account
        const result = await EpicOAuthService.linkAccount(discordId, code);
        
        if (result.success) {
            res.send(`
                <html>
                    <body>
                        <h1>✅ Successfully Linked!</h1>
                        <p>Your Epic account (${result.epicUsername}) has been linked to your Discord account.</p>
                        <p>You can close this window and return to Discord.</p>
                    </body>
                </html>
            `);
        } else {
            res.send(`
                <html>
                    <body>
                        <h1>❌ Linking Failed</h1>
                        <p>Error: ${result.error}</p>
                        <p>You can close this window and return to Discord.</p>
                    </body>
                </html>
            `);
        }
    } catch (error) {
        console.error('[OAUTH CALLBACK] Error:', error);
        res.send(`
            <html>
                <body>
                    <h1>❌ Authentication Failed</h1>
                    <p>Something went wrong during authentication.</p>
                    <p>You can close this window and return to Discord.</p>
                </body>
            </html>
        `);
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`[WEB SERVER] Running on port ${PORT}`);
    console.log(`[WEB SERVER] OAuth callback: http://localhost:${PORT}/api/epic/callback`);
});

module.exports = app;
