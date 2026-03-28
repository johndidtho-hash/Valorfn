const axios = require('axios');
const config = require('../config');
const { encrypt, decrypt } = require('../utils/encryption');
const { run, get, all } = require('../database/connection');
const logger = require('../utils/logger');

class EpicOAuthService {
    constructor() {
        this.clientId = config.epic.clientId;
        this.clientSecret = config.epic.clientSecret;
        this.redirectUri = 'https://valorfn.carrd.co/api/epic/callback';
        this.tokenUrl = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
        this.authUrl = 'https://www.epicgames.com/id/authorize';
    }

    getAuthorizationUrl(state) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid',
            state: state
        });
        const url = `${this.authUrl}?${params.toString()}`;
        
        console.log('[EPIC OAUTH DEBUG] ========== GENERATING AUTH URL ==========');
        console.log('[EPIC OAUTH DEBUG] client_id:', this.clientId);
        console.log('[EPIC OAUTH DEBUG] redirect_uri:', this.redirectUri);
        console.log('[EPIC OAUTH DEBUG] scope: openid');
        console.log('[EPIC OAUTH DEBUG] state:', state);
        console.log('[EPIC OAUTH DEBUG] FULL URL:', url);
        console.log('[EPIC OAUTH DEBUG] =========================================');
        
        return url;
    }

    async exchangeCodeForToken(code) {
        console.log('[EPIC OAUTH DEBUG] ========== EXCHANGING CODE FOR TOKEN ==========');
        console.log('[EPIC OAUTH DEBUG] code received:', code ? 'YES (hidden for security)' : 'NO');
        console.log('[EPIC OAUTH DEBUG] client_id:', this.clientId);
        console.log('[EPIC OAUTH DEBUG] redirect_uri:', this.redirectUri);
        
        try {
            const authHeader = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
            console.log('[EPIC OAUTH DEBUG] Authorization header length:', authHeader.length);
            
            const requestBody = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUri
            });
            console.log('[EPIC OAUTH DEBUG] Request body:', requestBody.toString());
            
            const response = await axios.post(
                this.tokenUrl,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': authHeader
                    }
                }
            );

            console.log('[EPIC OAUTH DEBUG] SUCCESS! Token response:');
            console.log('[EPIC OAUTH DEBUG] access_token exists:', !!response.data.access_token);
            console.log('[EPIC OAUTH DEBUG] refresh_token exists:', !!response.data.refresh_token);
            console.log('[EPIC OAUTH DEBUG] expires_in:', response.data.expires_in);
            console.log('[EPIC OAUTH DEBUG] ==========================================================');

            return response.data;
        } catch (error) {
            console.error('[EPIC OAUTH DEBUG] ========== TOKEN EXCHANGE FAILED ==========');
            console.error('[EPIC OAUTH DEBUG] Error message:', error.message);
            console.error('[EPIC OAUTH DEBUG] Error code:', error.code);
            if (error.response) {
                console.error('[EPIC OAUTH DEBUG] Response status:', error.response.status);
                console.error('[EPIC OAUTH DEBUG] Response data:', JSON.stringify(error.response.data, null, 2));
                console.error('[EPIC OAUTH DEBUG] Response headers:', JSON.stringify(error.response.headers, null, 2));
            }
            console.error('[EPIC OAUTH DEBUG] ==========================================================');
            logger.error('Epic OAuth token exchange error:', error.response?.data || error.message);
            throw error;
        }
    }

    async refreshAccessToken(refreshToken) {
        try {
            const response = await axios.post(
                this.tokenUrl,
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Epic OAuth refresh error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getAccountInfo(accessToken) {
        try {
            const response = await axios.get(
                'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Epic account info error:', error.response?.data || error.message);
            throw error;
        }
    }

    async linkAccount(discordId, code) {
        try {
            const tokenData = await this.exchangeCodeForToken(code);
            const accountInfo = await this.getAccountInfo(tokenData.access_token);

            const now = Math.floor(Date.now() / 1000);
            const expiresAt = now + tokenData.expires_in;

            // Store encrypted tokens
            await run(
                `UPDATE users 
                SET epic_id = ?, 
                    epic_username = ?, 
                    access_token = ?, 
                    refresh_token = ?,
                    token_expires_at = ?,
                    is_linked = 1,
                    updated_at = ?
                WHERE discord_id = ?`,
                [
                    accountInfo.id,
                    accountInfo.displayName,
                    encrypt(tokenData.access_token),
                    encrypt(tokenData.refresh_token),
                    expiresAt,
                    now,
                    discordId
                ]
            );

            logger.info(`Linked Epic account ${accountInfo.displayName} to Discord ${discordId}`);
            return {
                success: true,
                epicId: accountInfo.id,
                epicUsername: accountInfo.displayName
            };
        } catch (error) {
            logger.error('Account linking error:', error);
            return { success: false, error: error.message };
        }
    }

    async unlinkAccount(discordId) {
        try {
            await run(
                `UPDATE users 
                SET epic_id = NULL, 
                    epic_username = NULL, 
                    access_token = NULL, 
                    refresh_token = NULL,
                    token_expires_at = NULL,
                    is_linked = 0,
                    updated_at = ?
                WHERE discord_id = ?`,
                [Math.floor(Date.now() / 1000), discordId]
            );

            logger.info(`Unlinked Epic account from Discord ${discordId}`);
            return { success: true };
        } catch (error) {
            logger.error('Account unlinking error:', error);
            return { success: false, error: error.message };
        }
    }

    async getValidAccessToken(discordId) {
        try {
            const user = await get('SELECT access_token, refresh_token, token_expires_at FROM users WHERE discord_id = ?', [discordId]);

            if (!user || !user.access_token) {
                return null;
            }

            const now = Math.floor(Date.now() / 1000);
            
            // Check if token is expired or about to expire (5 min buffer)
            if (user.token_expires_at < now + 300) {
                // Refresh token
                const decryptedRefresh = decrypt(user.refresh_token);
                if (!decryptedRefresh) return null;

                const newTokenData = await this.refreshAccessToken(decryptedRefresh);
                
                // Store new tokens
                await run(
                    `UPDATE users 
                    SET access_token = ?, refresh_token = ?, token_expires_at = ?
                    WHERE discord_id = ?`,
                    [
                        encrypt(newTokenData.access_token),
                        encrypt(newTokenData.refresh_token),
                        now + newTokenData.expires_in,
                        discordId
                    ]
                );

                return newTokenData.access_token;
            }

            return decrypt(user.access_token);
        } catch (error) {
            logger.error('Get valid token error:', error);
            return null;
        }
    }
}

module.exports = new EpicOAuthService();
