const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

const openai = new OpenAI({
    apiKey: config.openai.apiKey
});

class AIService {
    async analyzeFortniteStats(stats) {
        try {
            const prompt = this.buildStatsPrompt(stats);
            
            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert Fortnite coach. Analyze player stats and provide personalized insights.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_object' }
            });

            const analysis = JSON.parse(response.choices[0].message.content);
            return this.validateAnalysis(analysis);
        } catch (error) {
            logger.error('AI analysis error:', error);
            return this.getFallbackAnalysis(stats);
        }
    }

    buildStatsPrompt(stats) {
        return `Analyze these Fortnite Battle Royale stats and provide insights in JSON format:
        
Stats:
- Wins: ${stats.wins}
- Matches: ${stats.matches}
- Kills: ${stats.kills}
- K/D: ${stats.kd}
- Win Rate: ${stats.winRate}%
- Top 10s: ${stats.top10}
- Top 25s: ${stats.top25}

Provide response in this JSON format:
{
    "score": 0-100,
    "strengths": ["strength1", "strength2"],
    "improvements": ["area1", "area2"],
    "recommendations": ["tip1", "tip2", "tip3"]
}`;
    }

    validateAnalysis(analysis) {
        return {
            score: Math.min(100, Math.max(0, analysis.score || 50)),
            strengths: analysis.strengths || [],
            improvements: analysis.improvements || [],
            recommendations: analysis.recommendations || []
        };
    }

    getFallbackAnalysis(stats) {
        const kd = stats.kd || 0;
        let score = 50;
        let strengths = [];
        let improvements = [];
        
        if (kd > 2) {
            score = 85;
            strengths.push('Exceptional K/D ratio');
        } else if (kd > 1) {
            score = 70;
            strengths.push('Above average combat skills');
        } else {
            improvements.push('Focus on improving combat fundamentals');
        }

        if (stats.winRate > 10) {
            score += 10;
            strengths.push('Strong end-game performance');
        }

        return {
            score: Math.min(100, score),
            strengths,
            improvements,
            recommendations: [
                'Practice in Creative mode for 30 min daily',
                'Review replays of deaths to identify mistakes',
                'Focus on positioning in late-game scenarios'
            ]
        };
    }

    async generateHighlightCard(stats, cosmetics) {
        try {
            const cosmeticList = cosmetics.map(c => c.name).join(', ');
            
            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate a short, hype Fortnite player profile summary.'
                    },
                    {
                        role: 'user',
                        content: `Create a highlight summary for a player with ${stats.wins} wins, ${stats.kd} K/D, and these cosmetics: ${cosmeticList}. Keep it under 100 words and make it sound epic.`
                    }
                ]
            });

            return response.choices[0].message.content;
        } catch (error) {
            logger.error('Highlight card generation error:', error);
            return `Elite player with ${stats.wins} victories and ${stats.kd} K/D ratio. A true Fortnite legend!`;
        }
    }

    async getCosmeticRecommendation(preferences) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a Fortnite cosmetic expert. Recommend items based on player preferences.'
                    },
                    {
                        role: 'user',
                        content: `Player likes: ${preferences}. Suggest 3 specific Fortnite cosmetics they might enjoy and why. Keep it brief.`
                    }
                ]
            });

            return response.choices[0].message.content;
        } catch (error) {
            logger.error('Recommendation error:', error);
            return 'Based on your preferences, consider checking the Item Shop regularly for items matching your style!';
        }
    }
}

module.exports = new AIService();
