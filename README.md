# Daemo-Bounty - News API Agent

Aarush K's submission for the Daemo Bounty (News API).

## Features

- **daemo agent integration**: uses the daemo query api for intelligence and tool calling.
- **real-time news**: fetches latest headlines and articles directly from the news api.
- **web dashboard**: sleek frontend for browsing news and chatting with the agent.
- **smart briefs**: automated industry and company-specific news summaries.
- **advanced insights**:
  - industry pulse (top sources + trend keywords)
  - company coverage comparison
  - market-moving events feed

## Setup

1. **install dependencies**: `npm install`
2. **configure environment**: create `.env` from `src/env.example` with your keys.
3. **run**: `npm start` (starts frontend at `http://localhost:3000`).

## Environment Variables

- `DAEMO_AGENT_API_KEY`: your daemo live api key.
- `DAEMO_AGENT_ID`: the id of your daemo agent.
- `NEWS_API_KEY`: your newsapi.org key.

## Extra API Endpoints

- `GET /api/insights/industry-pulse?industry=ai&days=7`
- `GET /api/insights/compare-companies?companyA=apple&companyB=microsoft&days=7`
- `GET /api/insights/market-movers?days=3`
