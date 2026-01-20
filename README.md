# Daemo-Bounty - News API Agent

Aarush K's submission for the Daemo Bounty (News API).

An AI news brief agent that summarizes breaking news relevant to specific industries or companies using the News API and Daemo SDK.

## Project Structure

```
.
├── public/
│   └── index.html            # Frontend web interface
├── src/
│   ├── services/
│   │   └── MyFunctions.ts    # Contains Daemo tools/functions (News API integration)
│   ├── env.example           # Template for environment variables
│   └── index.ts              # Entry point (Express server + Daemo agent)
├── package.json
└── README.md
```

## Features

The agent provides the following capabilities:
- **Get Top Headlines**: Fetch breaking news by country and category
- **Search News**: Find articles about specific topics, companies, or industries
- **Company News Monitor**: Track news about specific companies with date filtering
- **News Briefs**: Generate summarized alerts about relevant news

## Website UI

A sleek web dashboard has been added to see the agent in action. After starting the server, visit `http://localhost:3000` to access the interactive interface where you can browse headlines, search news, track companies, and view AI-generated briefs in real-time.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory based on the template in `src/env.example`.
   
   ```bash
   # Copy template to root .env
   cp src/env.example .env
   ```
   
   Then edit `.env` and add your API keys:
   ```
   DAEMO_AGENT_API_KEY=daemo_live_...
   NEWS_API_KEY=your-newsapi-key-here
   ```

3. **Run the agent:**
   ```bash
   npm start
   ```
   
   This starts the Express server on `http://localhost:3000` and connects the Daemo agent.

## API Keys

- **Daemo API Key**: Get from [Daemo Dashboard](https://daemo.ai)
- **News API Key**: Get from [NewsAPI.org](https://newsapi.org/)

## Usage Example

Once the agent is running, it can:
- Monitor breaking news in technology, business, or other categories
- Search for news about specific companies or topics
- Generate summarized briefs about relevant industry news
- Alert you to important developments

