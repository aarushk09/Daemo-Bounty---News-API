import "reflect-metadata";
import 'dotenv/config';
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
  console.log("🚀 News API Agent online!");
  console.log("📰 Ready to track breaking news and provide industry briefs");
}

main().catch(console.error);

