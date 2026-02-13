import { DaemoFunction } from 'daemo-engine';
import { z } from 'zod';
import axios from 'axios';
import "reflect-metadata";

const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

interface NormalizedArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  author: string;
  content: string;
}

// service for interacting with the news api and providing daemo tool functions
export class NewsService {
  private apiKey: string;
  public static recentBriefs: { summary: string; priority: string; timestamp: string }[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private normalizeArticles(articles: NewsArticle[]): NormalizedArticle[] {
    return articles.map((article) => ({
      title: article.title || '',
      description: article.description || '',
      url: article.url || '',
      source: article.source?.name || 'unknown',
      publishedAt: article.publishedAt || '',
      author: article.author || 'Unknown',
      content: article.content || article.description || ''
    }));
  }

  private getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'for', 'with', 'from', 'this', 'that', 'into', 'about',
      'after', 'before', 'over', 'under', 'their', 'they', 'them', 'you', 'your', 'will',
      'said', 'says', 'new', 'more', 'has', 'have', 'was', 'were', 'are', 'is', 'at', 'to',
      'in', 'on', 'of', 'as', 'by', 'be', 'it', 'its'
    ]);
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
  }

  // fetches top headlines from news api in real-time
  @DaemoFunction({
    description: "Get breaking news headlines for a specific country or category. ALWAYS fetches the latest data from News API in real-time. Returns recent top headlines with full article content.",
    inputSchema: z.object({
      country: z.string().optional().describe("2-letter country code (e.g., 'us', 'gb'). Default is 'us'"),
      category: z.enum(['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology']).optional().describe("News category to filter by"),
      pageSize: z.number().optional().describe("Number of results to return (max 100, default 20)")
    }) as any,
    outputSchema: z.object({
      articles: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        url: z.string(),
        source: z.string(),
        publishedAt: z.string(),
        author: z.string().optional(),
        content: z.string().optional()
      })),
      totalResults: z.number()
    }) as any
  })
  async getTopHeadlines(args: { country?: string; category?: string; pageSize?: number }) {
    try {
      const params: any = {
        apiKey: this.apiKey,
        country: args.country || 'us',
        pageSize: Math.min(args.pageSize || 20, 100)
      };
      if (args.category) params.category = args.category;
      const response = await axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/top-headlines`, { params });
      return {
        articles: this.normalizeArticles(response.data.articles),
        totalResults: response.data.totalResults
      };
    } catch (error: any) {
      console.error('error fetching top headlines:', error.response?.data || error.message);
      return { articles: [], totalResults: 0 };
    }
  }

  // searches for news articles based on keywords
  @DaemoFunction({
    description: "Search for news articles related to a specific topic, company, or industry. ALWAYS fetches the latest data from News API in real-time. Use this to find relevant news for summarization. Returns full article content.",
    inputSchema: z.object({
      query: z.string().optional().describe("Keywords or phrase to search for (e.g., 'artificial intelligence', 'Tesla', 'healthcare')"),
      sortBy: z.enum(['relevancy', 'popularity', 'publishedAt']).optional().describe("How to sort results (default: relevancy)"),
      language: z.string().optional().describe("2-letter language code (e.g., 'en'). Default is 'en'"),
      pageSize: z.number().optional().describe("Number of results (max 100, default 20)")
    }) as any,
    outputSchema: z.object({
      articles: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        url: z.string(),
        source: z.string(),
        publishedAt: z.string(),
        author: z.string().optional(),
        content: z.string().optional()
      })),
      totalResults: z.number()
    }) as any
  })
  async searchNews(args: { query?: string; sortBy?: 'relevancy' | 'popularity' | 'publishedAt'; language?: string; pageSize?: number }) {
    try {
      if (!args.query) return { articles: [], totalResults: 0 };
      const params: any = {
        apiKey: this.apiKey,
        q: args.query,
        sortBy: args.sortBy || 'relevancy',
        language: args.language || 'en',
        pageSize: Math.min(args.pageSize || 20, 100)
      };
      const response = await axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/everything`, { params });
      return {
        articles: this.normalizeArticles(response.data.articles),
        totalResults: response.data.totalResults
      };
    } catch (error: any) {
      console.error('error searching news:', error.response?.data || error.message);
      return { articles: [], totalResults: 0 };
    }
  }

  // gets news specific to a company
  @DaemoFunction({
    description: "Get news articles about a specific company by name. ALWAYS fetches the latest data from News API in real-time. Useful for monitoring company-specific news. Returns full article content.",
    inputSchema: z.object({
      companyName: z.string().optional().describe("Name of the company to search for"),
      dateFrom: z.string().optional().describe("Start date in ISO format (YYYY-MM-DD)"),
      dateTo: z.string().optional().describe("End date in ISO format (YYYY-MM-DD)"),
      pageSize: z.number().optional().describe("Number of results (max 100, default 10)")
    }) as any,
    outputSchema: z.object({
      articles: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        url: z.string(),
        source: z.string(),
        publishedAt: z.string(),
        author: z.string().optional(),
        content: z.string().optional()
      })),
      totalResults: z.number()
    }) as any
  })
  async getCompanyNews(args: { companyName?: string; dateFrom?: string; dateTo?: string; pageSize?: number }) {
    try {
      if (!args.companyName) return { articles: [], totalResults: 0 };
      const params: any = {
        apiKey: this.apiKey,
        q: args.companyName,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: Math.min(args.pageSize || 10, 100)
      };
      if (args.dateFrom) params.from = args.dateFrom;
      if (args.dateTo) params.to = args.dateTo;
      const response = await axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/everything`, { params });
      return {
        articles: this.normalizeArticles(response.data.articles),
        totalResults: response.data.totalResults
      };
    } catch (error: any) {
      console.error('error fetching company news:', error.response?.data || error.message);
      return { articles: [], totalResults: 0 };
    }
  }

  // stores and logs news briefs for the frontend
  @DaemoFunction({
    description: "Generate a brief summary or alert about news articles. Use this to create news briefs for the user.",
    inputSchema: z.object({
      summary: z.string().describe("The news brief summary or alert message"),
      priority: z.enum(['low', 'medium', 'high']).optional().describe("Priority level of the brief")
    }) as any,
    outputSchema: z.object({
      success: z.boolean(),
      timestamp: z.string()
    }) as any
  })
  async sendNewsBrief(args: { summary: string; priority?: 'low' | 'medium' | 'high' }) {
    const timestamp = new Date().toISOString();
    NewsService.recentBriefs.unshift({
      summary: args.summary,
      priority: args.priority || 'medium',
      timestamp
    });
    if (NewsService.recentBriefs.length > 10) NewsService.recentBriefs.pop();
    return { success: true, timestamp };
  }

  @DaemoFunction({
    description: "Builds an industry pulse with trend keywords, top sources, and recent notable headlines.",
    inputSchema: z.object({
      industry: z.string().describe("industry or theme, e.g. fintech, semiconductors, cybersecurity"),
      days: z.number().optional().describe("lookback window in days (default 7, max 30)"),
      language: z.string().optional().describe("2-letter language code, default en")
    }) as any,
    outputSchema: z.object({
      industry: z.string(),
      windowDays: z.number(),
      totalResults: z.number(),
      topSources: z.array(z.object({ source: z.string(), count: z.number() })),
      topKeywords: z.array(z.object({ keyword: z.string(), count: z.number() })),
      notableHeadlines: z.array(z.object({
        title: z.string(),
        source: z.string(),
        publishedAt: z.string(),
        url: z.string()
      }))
    }) as any
  })
  async getIndustryPulse(args: { industry: string; days?: number; language?: string }) {
    try {
      const windowDays = Math.min(Math.max(args.days || 7, 1), 14);
      const response = await axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/everything`, {
        params: {
          apiKey: this.apiKey,
          q: args.industry,
          from: this.getDateDaysAgo(windowDays),
          sortBy: 'publishedAt',
          language: args.language || 'en',
          pageSize: 15
        }
      });
      const articles = this.normalizeArticles(response.data.articles);

      const sourceCount = new Map<string, number>();
      const keywordCount = new Map<string, number>();
      for (const article of articles) {
        sourceCount.set(article.source, (sourceCount.get(article.source) || 0) + 1);
        for (const w of this.extractKeywords(article.title)) {
          keywordCount.set(w, (keywordCount.get(w) || 0) + 1);
        }
      }

      const topSources = [...sourceCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([source, count]) => ({ source, count }));
      const topKeywords = [...keywordCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([keyword, count]) => ({ keyword, count }));
      const notableHeadlines = articles.slice(0, 5).map((a) => ({ title: a.title, source: a.source, publishedAt: a.publishedAt, url: a.url }));

      return { industry: args.industry, windowDays, totalResults: response.data.totalResults, topSources, topKeywords, notableHeadlines };
    } catch (error: any) {
      console.error('error building industry pulse:', error.response?.data || error.message);
      return { industry: args.industry, windowDays: args.days || 7, totalResults: 0, topSources: [], topKeywords: [], notableHeadlines: [] };
    }
  }

  @DaemoFunction({
    description: "Compares media coverage volume and recent headlines between two companies.",
    inputSchema: z.object({
      companyA: z.string().describe("first company name"),
      companyB: z.string().describe("second company name"),
      days: z.number().optional().describe("lookback window in days (default 7, max 30)")
    }) as any,
    outputSchema: z.object({
      windowDays: z.number(),
      companyA: z.object({
        name: z.string(),
        totalResults: z.number(),
        recentHeadlines: z.array(z.object({
          title: z.string(),
          source: z.string(),
          publishedAt: z.string(),
          url: z.string()
        }))
      }),
      companyB: z.object({
        name: z.string(),
        totalResults: z.number(),
        recentHeadlines: z.array(z.object({
          title: z.string(),
          source: z.string(),
          publishedAt: z.string(),
          url: z.string()
        }))
      }),
      deltaCoverage: z.number()
    }) as any
  })
  async compareCompanyCoverage(args: { companyA: string; companyB: string; days?: number }) {
    try {
      const windowDays = Math.min(Math.max(args.days || 7, 1), 14);
      const from = this.getDateDaysAgo(windowDays);
      const [aRes, bRes] = await Promise.all([
        axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/everything`, {
          params: { apiKey: this.apiKey, q: args.companyA, from, sortBy: 'publishedAt', language: 'en', pageSize: 10 }
        }),
        axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/everything`, {
          params: { apiKey: this.apiKey, q: args.companyB, from, sortBy: 'publishedAt', language: 'en', pageSize: 10 }
        })
      ]);
      const aArticles = this.normalizeArticles(aRes.data.articles);
      const bArticles = this.normalizeArticles(bRes.data.articles);
      return {
        windowDays,
        companyA: { name: args.companyA, totalResults: aRes.data.totalResults, recentHeadlines: aArticles.slice(0, 3).map((a) => ({ title: a.title, source: a.source, publishedAt: a.publishedAt, url: a.url })) },
        companyB: { name: args.companyB, totalResults: bRes.data.totalResults, recentHeadlines: bArticles.slice(0, 3).map((a) => ({ title: a.title, source: a.source, publishedAt: a.publishedAt, url: a.url })) },
        deltaCoverage: aRes.data.totalResults - bRes.data.totalResults
      };
    } catch (error: any) {
      console.error('error comparing company coverage:', error.response?.data || error.message);
      return { windowDays: args.days || 7, companyA: { name: args.companyA, totalResults: 0, recentHeadlines: [] }, companyB: { name: args.companyB, totalResults: 0, recentHeadlines: [] }, deltaCoverage: 0 };
    }
  }

  @DaemoFunction({
    description: "Finds potentially market-moving events by scanning recent business and technology headlines.",
    inputSchema: z.object({
      query: z.string().optional().describe("optional custom query, e.g. earnings OR merger OR layoffs"),
      days: z.number().optional().describe("lookback window in days (default 3, max 14)")
    }) as any,
    outputSchema: z.object({
      windowDays: z.number(),
      totalScanned: z.number(),
      events: z.array(z.object({
        title: z.string(),
        source: z.string(),
        publishedAt: z.string(),
        url: z.string(),
        trigger: z.string()
      }))
    }) as any
  })
  async getMarketMovingEvents(args: { query?: string; days?: number }) {
    try {
      const windowDays = Math.min(Math.max(args.days || 3, 1), 7);
      const q = args.query || 'earnings OR merger OR layoffs';
      const response = await axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/everything`, {
        params: { apiKey: this.apiKey, q, from: this.getDateDaysAgo(windowDays), sortBy: 'publishedAt', language: 'en', pageSize: 15 }
      });
      const articles = this.normalizeArticles(response.data.articles);
      const events = articles.slice(0, 6).map((a) => ({
        title: a.title,
        source: a.source,
        publishedAt: a.publishedAt,
        url: a.url,
        trigger: 'event'
      }));
      return { windowDays, totalScanned: response.data.totalResults, events };
    } catch (error: any) {
      console.error('error fetching market moving events:', error.response?.data || error.message);
      return { windowDays: args.days || 3, totalScanned: 0, events: [] };
    }
  }
}
