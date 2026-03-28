const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class FortniteAPIService {
    constructor() {
        this.baseURL = config.fortnite.baseUrl;
        this.headers = {
            'Authorization': config.fortnite.apiKey
        };
    }

    async request(endpoint, params = {}) {
        const url = `${this.baseURL}${endpoint}`;
        console.log(`[FORTNITE API DEBUG] Making request to: ${url}`);
        console.log(`[FORTNITE API DEBUG] Headers:`, JSON.stringify(this.headers, null, 2));
        console.log(`[FORTNITE API DEBUG] Params:`, JSON.stringify(params, null, 2));
        
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                params
            });
            
            console.log(`[FORTNITE API DEBUG] SUCCESS - Status: ${response.status}`);
            console.log(`[FORTNITE API DEBUG] Response has data: ${!!response.data}`);
            if (response.data && response.data.data) {
                console.log(`[FORTNITE API DEBUG] Response data structure:`, Object.keys(response.data.data));
            }
            
            return response.data;
        } catch (error) {
            console.error(`[FORTNITE API DEBUG] FAILED - ${endpoint}`);
            console.error(`[FORTNITE API DEBUG] Error message:`, error.message);
            console.error(`[FORTNITE API DEBUG] Error code:`, error.code);
            if (error.response) {
                console.error(`[FORTNITE API DEBUG] Response status:`, error.response.status);
                console.error(`[FORTNITE API DEBUG] Response data:`, JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    // Stats
    async getStats(username) {
        return this.request(`/v2/stats/br/v2`, { name: username });
    }

    async getStatsByAccountId(accountId) {
        return this.request(`/v2/stats/br/v2/${accountId}`);
    }

    // Cosmetics
    async getAllCosmetics() {
        return this.request('/v2/cosmetics');
    }

    async getNewCosmetics() {
        return this.request('/v2/cosmetics/new');
    }

    async getBRCosmetics() {
        return this.request('/v2/cosmetics/br');
    }

    async getTracks() {
        return this.request('/v2/cosmetics/tracks');
    }

    async getInstruments() {
        return this.request('/v2/cosmetics/instruments');
    }

    async getCars() {
        return this.request('/v2/cosmetics/cars');
    }

    async getLegoCosmetics() {
        return this.request('/v2/cosmetics/lego');
    }

    async getLegoKits() {
        return this.request('/v2/cosmetics/lego/kits');
    }

    async getBeansCosmetics() {
        return this.request('/v2/cosmetics/beans');
    }

    async getCosmeticById(id) {
        return this.request(`/v2/cosmetics/br/${id}`);
    }

    async searchCosmetics(name, type = null) {
        const params = { name };
        if (type) params.type = type;
        return this.request('/v2/cosmetics/br/search', params);
    }

    async searchAllCosmetics(name) {
        return this.request('/v2/cosmetics/br/search/all', { name });
    }

    async searchCosmeticsByIds(ids) {
        return this.request('/v2/cosmetics/br/search/ids', { id: ids.join(',') });
    }

    // Shop
    async getShop() {
        console.log('[FORTNITE API DEBUG] ========== GETTING SHOP ==========');
        const result = await this.request('/v2/shop');
        console.log('[FORTNITE API DEBUG] Shop result keys:', Object.keys(result || {}));
        if (result && result.data) {
            console.log('[FORTNITE API DEBUG] Shop data keys:', Object.keys(result.data));
            const shop = result.data;
            console.log('[FORTNITE API DEBUG] Featured entries:', shop.featured?.entries?.length || 0);
            console.log('[FORTNITE API DEBUG] Daily entries:', shop.daily?.entries?.length || 0);
            console.log('[FORTNITE API DEBUG] Special featured entries:', shop.specialFeatured?.entries?.length || 0);
            console.log('[FORTNITE API DEBUG] Vault entries:', shop.vault?.entries?.length || 0);
        }
        console.log('[FORTNITE API DEBUG] ====================================');
        return result;
    }

    // News
    async getNews() {
        return this.request('/v2/news');
    }

    async getBRNews() {
        return this.request('/v2/news/br');
    }

    async getSTWNews() {
        return this.request('/v2/news/stw');
    }

    async getCreativeNews() {
        return this.request('/v2/news/creative');
    }

    // Map
    async getMap() {
        return this.request('/v1/map');
    }

    // Playlists
    async getPlaylists() {
        return this.request('/v1/playlists');
    }

    async getPlaylistById(id) {
        return this.request(`/v1/playlists/${id}`);
    }

    // Creator Code
    async getCreatorCode(code) {
        return this.request('/v2/creatorcode', { name: code });
    }

    // AES
    async getAES() {
        return this.request('/v2/aes');
    }

    // Banners
    async getBanners() {
        return this.request('/v1/banners');
    }

    async getBannerColors() {
        return this.request('/v1/banners/colors');
    }

    // Cache helper
    async getCachedCosmetics() {
        if (!this.cosmeticsCache || this.cacheExpiry < Date.now()) {
            const response = await this.getAllCosmetics();
            this.cosmeticsCache = response.data;
            this.cacheExpiry = Date.now() + 30 * 60 * 1000; // 30 min cache
        }
        return this.cosmeticsCache;
    }

    async findCosmeticByName(name) {
        const cosmetics = await this.getCachedCosmetics();
        return cosmetics.find(c => 
            c.name.toLowerCase() === name.toLowerCase() ||
            c.name.toLowerCase().includes(name.toLowerCase())
        );
    }
}

module.exports = new FortniteAPIService();
