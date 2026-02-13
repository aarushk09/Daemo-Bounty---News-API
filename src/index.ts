import "reflect-metadata";
import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { DaemoBuilder, DaemoHostedConnection } from 'daemo-engine';
import { NewsService } from './services/MyFunctions';
import { ChatService } from './services/ChatService';

// entry point for the application starting express and daemo agent
async function main() {
  if (!process.env.DAEMO_AGENT_API_KEY || !process.env.DAEMO_AGENT_ID || !process.env.NEWS_API_KEY) {
    console.error("❌ error: missing required environment variables in .env file");
    process.exit(1);
  }

  const newsService = new NewsService(process.env.NEWS_API_KEY);
  const chatService = new ChatService(
    process.env.DAEMO_AGENT_API_KEY,
    process.env.DAEMO_AGENT_ID
  );

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // api routes for news and chat
  app.get('/api/headlines', async (req, res) => {
    const { category, country } = req.query;
    const results = await newsService.getTopHeadlines({ 
      category: category as any, 
      country: country as string 
    });
    res.json(results);
  });

  app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    const results = await newsService.searchNews({ query: q as string });
    res.json(results);
  });

  app.get('/api/company', async (req, res) => {
    const { name } = req.query;
    const results = await newsService.getCompanyNews({ companyName: name as string });
    res.json(results);
  });

  app.get('/api/briefs', (req, res) => {
    res.json(NewsService.recentBriefs);
  });

  app.get('/api/insights/industry-pulse', async (req, res) => {
    const { industry, days, language } = req.query;
    if (!industry || typeof industry !== 'string') {
      return res.status(400).json({ error: 'industry is required' });
    }
    const data = await newsService.getIndustryPulse({
      industry,
      days: days ? Number(days) : undefined,
      language: typeof language === 'string' ? language : undefined
    });
    res.json(data);
  });

  app.get('/api/insights/compare-companies', async (req, res) => {
    const { companyA, companyB, days } = req.query;
    if (!companyA || !companyB || typeof companyA !== 'string' || typeof companyB !== 'string') {
      return res.status(400).json({ error: 'companyA and companyB are required' });
    }
    const data = await newsService.compareCompanyCoverage({
      companyA,
      companyB,
      days: days ? Number(days) : undefined
    });
    res.json(data);
  });

  app.get('/api/insights/market-movers', async (req, res) => {
    const { query, days } = req.query;
    const data = await newsService.getMarketMovingEvents({
      query: typeof query === 'string' ? query : undefined,
      days: days ? Number(days) : undefined
    });
    res.json(data);
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, userId = 'default' } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
      }
      const response = await chatService.processMessage(userId, message);
      res.json({ response, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error('chat error:', error);
      res.status(500).json({ error: 'failed to process message' });
    }
  });

  app.get('/api/chat/history', (req, res) => {
    const { userId = 'default' } = req.query;
    const history = chatService.getConversationHistory(userId as string);
    res.json({ history });
  });

  app.post('/api/chat/clear', (req, res) => {
    const { userId = 'default' } = req.body;
    chatService.clearConversation(userId);
    res.json({ success: true });
  });

  app.listen(PORT, () => {
    console.log(`\n🌐 frontend available at http://localhost:${PORT}`);
  });

  // daemo agent configuration with system prompt
  const systemPrompt = `You are a helpful and knowledgeable news assistant powered by the News API. Your role is to help users stay informed about current events, breaking news, and industry developments.

**Your Personality:**
- Friendly, professional, and conversational
- Proactive in suggesting relevant news topics
- Clear and concise in your responses
- Helpful in guiding users to find the information they need

**Your Capabilities:**
- Fetch top headlines by category (technology, business, science, health, sports, entertainment, general)
- Search for news articles on any topic, company, or industry
- Track news about specific companies
- Generate and display news briefs with priority levels
- Answer follow-up questions and maintain conversation context

**Your Boundaries:**
- You can only access news from the News API (no real-time breaking news beyond what's available)
- You cannot access news older than 1 month (News API free tier limitation)
- You should not make predictions or financial advice
- You should cite sources when providing news information
- If you don't know something, admit it and suggest alternative ways to help

**How to Help Users:**
- When users ask for news, use the appropriate function (getTopHeadlines, searchNews, or getCompanyNews)
- Always provide context and ask follow-up questions to better assist
- Summarize key points from articles when helpful
- Suggest related topics or companies that might interest the user
- Remember previous conversation context to provide relevant follow-ups

Remember: Be helpful, accurate, and conversational. Make news discovery easy and enjoyable for users.`;

  const sessionData = new DaemoBuilder()
    .withServiceName("NewsAPIBriefAgent")
    .withSystemPrompt(systemPrompt)
    .registerService(newsService)
    .build();

  const connection = new DaemoHostedConnection(
    { 
      agentApiKey: process.env.DAEMO_AGENT_API_KEY, 
      daemoGatewayUrl: "https://engine.daemo.ai:50052/"
    },
    sessionData
  );

  await connection.start();
  console.log("🚀 daemo agent online!");
}

main().catch(console.error);
