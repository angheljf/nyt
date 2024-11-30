// types.ts

export interface NYTimesApiResponse {
    status: string;
    copyright: string;
    response: {
      docs: Article[];
      meta: {
        hits: number;
        offset: number;
        time: number;
      };
    };
  }
  
  export interface Article {
    abstract: string;
    web_url: string;
    snippet: string;
    lead_paragraph: string;
    print_section?: string;
    print_page?: string;
    source: string;
    multimedia: any[];
    headline: {
      main: string;
      kicker?: string;
      content_kicker?: string;
      print_headline?: string;
      name?: string;
      seo?: string;
      sub?: string;
    };
    keywords: Array<{
      name: string;
      value: string;
      rank: number;
      major: string;
    }>;
    pub_date: string;
    document_type: string;
    news_desk: string;
    section_name: string;
    byline: {
      original?: string;
      person?: Array<{
        firstname: string;
        middlename?: string;
        lastname: string;
        qualifier?: string;
        title?: string;
        role?: string;
        organization?: string;
        rank: number;
      }>;
      organization?: string;
    };
    type_of_material: string;
    _id: string;
    word_count: number;
    uri: string;
  }
  
  export interface SearchArticlesArgs {
    keyword: string;
  }
  
  // Type guard for search arguments
  export function isValidSearchArticlesArgs(args: any): args is SearchArticlesArgs {
    return (
      typeof args === "object" &&
      args !== null &&
      "keyword" in args &&
      typeof args.keyword === "string"
    );
  }
  
  export interface ArticleSearchResult {
    title: string;
    abstract: string;
    url: string;
    publishedDate: string;
    author: string;
  }
  