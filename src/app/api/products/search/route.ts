import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

interface ProductResult {
  id: string
  name: string
  description?: string
  imageUrl?: string
  amazonPrice?: number
  flipkartPrice?: number
  ebayPrice?: number
  amazonUrl?: string
  flipkartUrl?: string
  ebayUrl?: string
  category?: string
  rating?: number
  reviews?: number
}

// Helper function to extract price from text
function extractPrice(text: string): number | null {
  const priceMatch = text.match(/[\d,]+\.?\d*/);
  if (priceMatch) {
    return parseFloat(priceMatch[0].replace(/,/g, ''));
  }
  return null;
}

// Scrape Amazon
async function scrapeAmazon(searchTerm: string): Promise<ProductResult[]> {
  try {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}`;
    
    // Using fetch with headers to mimic browser request
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: ProductResult[] = [];

    $('[data-component-type="s-search-result"]').slice(0, 5).each((index, element) => {
      const $element = $(element);
      const name = $element.find('[data-cy="title-recipe-title"]').text().trim() || 
                  $element.find('h2 a span').text().trim();
      const priceWhole = $element.find('.a-price-whole').first().text().trim();
      const priceFraction = $element.find('.a-price-fraction').first().text().trim();
      const imageUrl = $element.find('img').first().attr('src');
      const productUrl = $element.find('h2 a').first().attr('href');
      const rating = $element.find('.a-icon-alt').first().text();
      const reviews = $element.find('.a-size-base').first().text();

      let price: number | null = null;
      if (priceWhole) {
        const fullPrice = `${priceWhole}${priceFraction ? `.${priceFraction}` : ''}`;
        price = extractPrice(fullPrice);
      }

      if (name && name.length > 0) {
        products.push({
          id: `amazon-${index}`,
          name,
          imageUrl: imageUrl?.startsWith('//') ? `https:${imageUrl}` : imageUrl,
          amazonPrice: price,
          amazonUrl: productUrl ? `https://amazon.com${productUrl}` : undefined,
          category: 'Electronics',
          rating: rating ? parseFloat(rating.split(' ')[0]) : undefined,
          reviews: reviews ? parseInt(reviews.replace(/[^\d]/g, '')) : undefined,
        });
      }
    });

    return products;
  } catch (error) {
    console.error('Amazon scraping error:', error);
    return [];
  }
}

// Scrape Flipkart
async function scrapeFlipkart(searchTerm: string): Promise<ProductResult[]> {
  try {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: ProductResult[] = [];

    $('._1AtVbE').slice(0, 5).each((index, element) => {
      const $element = $(element);
      const name = $element.find('._4rR01T').text().trim();
      const priceText = $element.find('._30jeq3').text().trim();
      const imageUrl = $element.find('._396cs4 img').attr('src');
      const productUrl = $element.find('._1fQZEK').attr('href');
      const rating = $element.find('._3LWZlK').text().trim();

      const price = extractPrice(priceText);

      if (name && name.length > 0) {
        products.push({
          id: `flipkart-${index}`,
          name,
          imageUrl,
          flipkartPrice: price,
          flipkartUrl: productUrl ? `https://flipkart.com${productUrl}` : undefined,
          category: 'Electronics',
          rating: rating ? parseFloat(rating) : undefined,
        });
      }
    });

    return products;
  } catch (error) {
    console.error('Flipkart scraping error:', error);
    return [];
  }
}

// Mock eBay scraper (eBay has stricter anti-bot measures)
async function scrapeEbay(searchTerm: string): Promise<ProductResult[]> {
  // For now, return mock data for eBay
  return [
    {
      id: 'ebay-1',
      name: `${searchTerm} - eBay Deal`,
      ebayPrice: Math.random() * 500 + 100,
      ebayUrl: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}`,
      category: 'Electronics',
      rating: 4.2,
      reviews: 234,
    },
  ];
}

// Combine results from multiple sources
function combineResults(amazonResults: ProductResult[], flipkartResults: ProductResult[], ebayResults: ProductResult[]): ProductResult[] {
  const combined: ProductResult[] = [];
  const maxLength = Math.max(amazonResults.length, flipkartResults.length);

  for (let i = 0; i < maxLength; i++) {
    const amazon = amazonResults[i];
    const flipkart = flipkartResults[i];
    const ebay = ebayResults[i];

    if (amazon && flipkart) {
      // Try to match similar products
      const similarity = amazon.name.toLowerCase().includes(flipkart.name.toLowerCase().split(' ')[0]) ||
                        flipkart.name.toLowerCase().includes(amazon.name.toLowerCase().split(' ')[0]);
      
      if (similarity) {
        combined.push({
          ...amazon,
          flipkartPrice: flipkart.flipkartPrice,
          flipkartUrl: flipkart.flipkartUrl,
          ebayPrice: ebay?.ebayPrice,
          ebayUrl: ebay?.ebayUrl,
        });
      } else {
        combined.push(amazon);
        combined.push(flipkart);
      }
    } else if (amazon) {
      combined.push({
        ...amazon,
        ebayPrice: ebay?.ebayPrice,
        ebayUrl: ebay?.ebayUrl,
      });
    } else if (flipkart) {
      combined.push({
        ...flipkart,
        ebayPrice: ebay?.ebayPrice,
        ebayUrl: ebay?.ebayUrl,
      });
    }
  }

  return combined.slice(0, 10); // Limit to 10 results
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category') || 'all';

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    console.log(`Searching for: ${query} in category: ${category}`);

    // Run searches in parallel
    const [amazonResults, flipkartResults, ebayResults] = await Promise.allSettled([
      scrapeAmazon(query),
      scrapeFlipkart(query),
      scrapeEbay(query),
    ]);

    const amazon = amazonResults.status === 'fulfilled' ? amazonResults.value : [];
    const flipkart = flipkartResults.status === 'fulfilled' ? flipkartResults.value : [];
    const ebay = ebayResults.status === 'fulfilled' ? ebayResults.value : [];

    const combinedResults = combineResults(amazon, flipkart, ebay);

    // If no results from scraping, return mock data
    if (combinedResults.length === 0) {
      const mockResults: ProductResult[] = [
        {
          id: 'mock-1',
          name: `${query} - Premium Model`,
          description: `High-quality ${query} with excellent features and specifications`,
          imageUrl: 'https://via.placeholder.com/200x200?text=Product',
          amazonPrice: Math.random() * 500 + 200,
          flipkartPrice: Math.random() * 500 + 200,
          ebayPrice: Math.random() * 500 + 200,
          amazonUrl: `https://amazon.com/s?k=${encodeURIComponent(query)}`,
          flipkartUrl: `https://flipkart.com/search?q=${encodeURIComponent(query)}`,
          ebayUrl: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`,
          category: category === 'all' ? 'Electronics' : category,
          rating: 4.3,
          reviews: 1245,
        },
        {
          id: 'mock-2',
          name: `${query} - Budget Edition`,
          description: `Affordable ${query} with great value for money`,
          imageUrl: 'https://via.placeholder.com/200x200?text=Budget',
          amazonPrice: Math.random() * 300 + 100,
          flipkartPrice: Math.random() * 300 + 100,
          ebayPrice: Math.random() * 300 + 100,
          amazonUrl: `https://amazon.com/s?k=${encodeURIComponent(query)}`,
          flipkartUrl: `https://flipkart.com/search?q=${encodeURIComponent(query)}`,
          ebayUrl: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`,
          category: category === 'all' ? 'Electronics' : category,
          rating: 4.0,
          reviews: 876,
        },
      ];
      return NextResponse.json({ products: mockResults, source: 'mock' });
    }

    return NextResponse.json({ 
      products: combinedResults, 
      source: 'scraped',
      counts: {
        amazon: amazon.length,
        flipkart: flipkart.length,
        ebay: ebay.length,
      }
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ 
      error: 'Failed to search products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
