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

export class NewsService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  @DaemoFunction({
    description: "Get breaking news headlines for a specific country or category. Returns recent top headlines.",
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
        author: z.string().optional()
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

      if (args.category) {
        params.category = args.category;
      }

      const response = await axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/top-headlines`, { params });

      return {
        articles: response.data.articles.map(article => ({
          title: article.title,
          description: article.description || '',
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          author: article.author || 'Unknown'
        })),
        totalResults: response.data.totalResults
      };
    } catch (error: any) {
      console.error('Error fetching top headlines:', error.response?.data || error.message);
      return { articles: [], totalResults: 0 };
    }
  }

  @DaemoFunction({
    description: "Search for news articles related to a specific topic, company, or industry. Use this to find relevant news for summarization.",
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
      if (!args.query) {
        return { articles: [], totalResults: 0 };
      }

      const params: any = {
        apiKey: this.apiKey,
        q: args.query,
        sortBy: args.sortBy || 'relevancy',
        language: args.language || 'en',
        pageSize: Math.min(args.pageSize || 20, 100)
      };

      const response = await axios.get<NewsApiResponse>(`${NEWS_API_BASE_URL}/everything`, { params });

      return {
        articles: response.data.articles.map(article => ({
          title: article.title,
          description: article.description || '',
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          author: article.author || 'Unknown',
          content: article.content || ''
        })),
        totalResults: response.data.totalResults
      };
    } catch (error: any) {
      console.error('Error searching news:', error.response?.data || error.message);
      return { articles: [], totalResults: 0 };
    }
  }

  @DaemoFunction({
    description: "Get news articles about a specific company by name. Useful for monitoring company-specific news.",
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
        author: z.string().optional()
      })),
      totalResults: z.number()
    }) as any
  })
  async getCompanyNews(args: { companyName?: string; dateFrom?: string; dateTo?: string; pageSize?: number }) {
    try {
      if (!args.companyName) {
        return { articles: [], totalResults: 0 };
      }

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
        articles: response.data.articles.map(article => ({
          title: article.title,
          description: article.description || '',
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          author: article.author || 'Unknown'
        })),
        totalResults: response.data.totalResults
      };
    } catch (error: any) {
      console.error('Error fetching company news:', error.response?.data || error.message);
      return { articles: [], totalResults: 0 };
    }
  }

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
    const priorityEmoji = {
      low: 'ℹ️',
      medium: '📰',
      high: '🚨'
    };
    const emoji = priorityEmoji[args.priority || 'medium'];
    
    console.log(`\n${emoji} NEWS BRIEF [${timestamp}]`);
    console.log('─'.repeat(80));
    console.log(args.summary);
    console.log('─'.repeat(80) + '\n');
    
    return { success: true, timestamp };
  }
}

