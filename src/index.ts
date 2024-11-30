#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import { 
  NYTimesApiResponse,
  ArticleSearchResult,
  isValidSearchArticlesArgs
} from "./types.js";

dotenv.config();

const API_KEY = process.env.NYTIMES_API_KEY;
if (!API_KEY) {
  throw new Error("NYTIMES_API_KEY environment variable is required");
}

const API_CONFIG = {
  BASE_URL: 'https://api.nytimes.com/svc/search/v2',
  ENDPOINT: 'articlesearch.json'
} as const;

class NYTimesServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server({
      name: "nytimes-article-search-server",
      version: "0.1.0"
    }, {
      capabilities: {
        resources: {},
        tools: {}
      }
    });

    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      params: {
        'api-key': API_KEY
      }
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  private setupResourceHandlers(): void {
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async () => ({
        resources: []  // No static resources for this server
      })
    );

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown resource: ${request.params.uri}`
        );
      }
    );
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: [{
          name: "search_articles",
          description: "Search NYTimes articles from the last 30 days based on a keyword",
          inputSchema: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "Keyword to search for in articles"
              }
            },
            required: ["keyword"]
          }
        }]
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        if (request.params.name !== "search_articles") {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
        }

        if (!isValidSearchArticlesArgs(request.params.arguments)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid search arguments"
          );
        }

        const keyword = request.params.arguments.keyword;

        try {
          const response = await this.axiosInstance.get<NYTimesApiResponse>(API_CONFIG.ENDPOINT, {
            params: {
              q: keyword,
              sort: 'newest',
              'begin_date': this.getDateString(30),  // 30 days ago
              'end_date': this.getDateString(0)  // today
            }
          });

          const articles: ArticleSearchResult[] = response.data.response.docs.map(article => ({
            title: article.headline.main,
            abstract: article.abstract,
            url: article.web_url,
            publishedDate: article.pub_date,
            author: article.byline.original || 'Unknown'
          }));

          return {
            content: [{
              type: "text",
              text: JSON.stringify(articles, null, 2)
            }]
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return {
              content: [{
                type: "text",
                text: `NYTimes API error: ${error.response?.data.message ?? error.message}`
              }],
              isError: true,
            }
          }
          throw error;
        }
      }
    );
  }

  private getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("NYTimes MCP server running on stdio");
  }
}

const server = new NYTimesServer();
server.run().catch(console.error);
