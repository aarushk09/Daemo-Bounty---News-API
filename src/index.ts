import "reflect-metadata";
import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { DaemoBuilder, DaemoHostedConnection } from 'daemo-engine';
import { NewsService } from './services/MyFunctions';

async function main() {
  // Check for required environment variables
  if (!process.env.DAEMO_AGENT_API_KEY) {
    console.error("❌ Error: DAEMO_AGENT_API_KEY not found in .env file");
    process.exit(1);
  }

  if (!process.env.NEWS_API_KEY) {
    console.error("❌ Error: NEWS_API_KEY not found in .env file");
    process.exit(1);
  }

  const newsService = new NewsService(process.env.NEWS_API_KEY);

  // --- Express Setup ---
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // API Endpoints for Frontend
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

  // Start Express Server
  app.listen(PORT, () => {
    console.log(`\n🌐 Frontend available at http://localhost:${PORT}`);
  });

  // --- Daemo Agent Setup ---
  const sessionData = new DaemoBuilder()
    .withServiceName("NewsAPIBriefAgent")
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
  console.log("🚀 Daemo Agent online!");
  console.log("📰 Ready to track breaking news and provide industry briefs\n");
}

main().catch(console.error);
