/**
 * Web Search and Browsing Utilities
 * 
 * Provides real-time web search and URL browsing capabilities
 * Uses DuckDuckGo HTML for search (no API key required)
 */

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Search the web using DuckDuckGo
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<{
  results: SearchResult[];
  searchUrl: string;
}> {
  try {
    console.log('🔍 [Web Search] Searching for:', query);
    
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const html = await response.text();
    const results = parseSearchResults(html, maxResults);
    
    console.log('✅ [Web Search] Found', results.length, 'results');
    return { results, searchUrl };
  } catch (error) {
    console.error('❌ [Web Search] Error:', error);
    throw error;
  }
}

/**
 * Parse DuckDuckGo HTML search results
 */
function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  
  // Extract result blocks using regex
  const resultPattern = /<div class="result__body">[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
  
  let match;
  while ((match = resultPattern.exec(html)) !== null && results.length < maxResults) {
    const url = decodeURIComponent(match[1]);
    const title = stripHtml(match[2]);
    const snippet = stripHtml(match[3]);
    
    // Filter out non-http URLs and DDG internal links
    if (url.startsWith('http') && !url.includes('duckduckgo.com')) {
      results.push({ title, url, snippet });
    }
  }
  
  return results;
}

/**
 * Browse a specific URL and extract text content
 */
export async function browseUrl(url: string): Promise<{
  title: string;
  content: string;
  url: string;
}> {
  try {
    console.log('🌐 [Browse URL] Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    const title = extractTitle(html);
    const content = extractMainContent(html);
    
    console.log('✅ [Browse URL] Extracted', content.length, 'characters');
    return { title, content, url };
  } catch (error) {
    console.error('❌ [Browse URL] Error:', error);
    throw error;
  }
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return titleMatch ? stripHtml(titleMatch[1]) : 'Untitled';
}

/**
 * Extract main content from HTML (simple approach)
 */
function extractMainContent(html: string): string {
  // Remove script and style tags
  let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  clean = clean.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  clean = clean.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  
  // Extract text content
  clean = stripHtml(clean);
  
  // Clean up whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // Limit to reasonable length (first 3000 chars)
  return clean.substring(0, 3000);
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  // Decode common HTML entities
  let text = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ''); // Remove all HTML tags
  
  // Clean up extra whitespace
  text = text.replace(/\n\s*\n/g, '\n').trim();
  
  return text;
}

/**
 * Format search results with citations for AI context
 */
export function formatSearchResultsForAI(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `No search results found for "${query}".`;
  }
  
  let formatted = `🔍 **Web Search Results for: "${query}"**\n\n`;
  formatted += `Found ${results.length} relevant results:\n\n`;
  
  results.forEach((result, index) => {
    formatted += `**[${index + 1}] ${result.title}**\n`;
    formatted += `Source: ${result.url}\n`;
    formatted += `${result.snippet}\n\n`;
  });
  
  formatted += `\n**Instructions for AI:**\n`;
  formatted += `- Use these search results to answer the user's question\n`;
  formatted += `- Always cite sources using [1], [2], etc. notation\n`;
  formatted += `- If results are insufficient, acknowledge limitations\n`;
  formatted += `- Prioritize recent and authoritative sources\n`;
  
  return formatted;
}

/**
 * Format browsed URL content for AI context
 */
export function formatBrowsedContentForAI(data: { title: string; content: string; url: string }): string {
  let formatted = `🔗 **Content from: ${data.url}**\n\n`;
  formatted += `**Title:** ${data.title}\n\n`;
  formatted += `**Content Preview:**\n${data.content}\n\n`;
  formatted += `**Instructions for AI:**\n`;
  formatted += `- Use this content to answer the user's question\n`;
  formatted += `- Cite the source URL: ${data.url}\n`;
  formatted += `- If content is incomplete, acknowledge limitations\n`;
  
  return formatted;
}

