import { NextRequest, NextResponse } from 'next/server'

interface PriceHistoryEntry {
  date: string
  amazonPrice?: number
  flipkartPrice?: number
  ebayPrice?: number
  timestamp: number
}

interface ProductPriceHistory {
  productId: string
  productName: string
  currentPrices: {
    amazon?: number
    flipkart?: number
    ebay?: number
  }
  history: PriceHistoryEntry[]
  priceChange: {
    amazon?: { value: number; percentage: number }
    flipkart?: { value: number; percentage: number }
    ebay?: { value: number; percentage: number }
  }
  lastUpdated: string
}

// Simulate price history data (in a real app, this would come from database)
function generatePriceHistory(productName: string, days: number = 30): PriceHistoryEntry[] {
  const history: PriceHistoryEntry[] = []
  const now = new Date()
  
  // Base prices with some realistic variation
  let baseAmazonPrice = Math.random() * 400 + 200
  let baseFlipkartPrice = baseAmazonPrice * (0.9 + Math.random() * 0.2) // ±10% variation
  let baseEbayPrice = baseAmazonPrice * (0.85 + Math.random() * 0.3) // ±15% variation

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Add random price fluctuations
    const amazonFluctuation = (Math.random() - 0.5) * 20 // ±$10 fluctuation
    const flipkartFluctuation = (Math.random() - 0.5) * 25 // ±$12.5 fluctuation
    const ebayFluctuation = (Math.random() - 0.5) * 30 // ±$15 fluctuation

    // Apply trending (prices tend to change over time)
    const trend = Math.sin(i / 10) * 15 // Sine wave trend
    
    history.push({
      date: date.toISOString().split('T')[0],
      amazonPrice: Math.round((baseAmazonPrice + amazonFluctuation + trend) * 100) / 100,
      flipkartPrice: Math.round((baseFlipkartPrice + flipkartFluctuation + trend) * 100) / 100,
      ebayPrice: Math.round((baseEbayPrice + ebayFluctuation + trend) * 100) / 100,
      timestamp: date.getTime()
    })

    // Gradually adjust base prices (market trends)
    baseAmazonPrice += (Math.random() - 0.5) * 2
    baseFlipkartPrice += (Math.random() - 0.5) * 2.5
    baseEbayPrice += (Math.random() - 0.5) * 3
  }

  return history.sort((a, b) => a.timestamp - b.timestamp)
}

// Calculate price changes
function calculatePriceChanges(history: PriceHistoryEntry[]) {
  if (history.length < 2) return {}

  const latest = history[history.length - 1]
  const previous = history[history.length - 8] || history[0] // Week ago or earliest

  const changes: any = {}

  if (latest.amazonPrice && previous.amazonPrice) {
    const value = latest.amazonPrice - previous.amazonPrice
    changes.amazon = {
      value: Math.round(value * 100) / 100,
      percentage: Math.round((value / previous.amazonPrice) * 10000) / 100
    }
  }

  if (latest.flipkartPrice && previous.flipkartPrice) {
    const value = latest.flipkartPrice - previous.flipkartPrice
    changes.flipkart = {
      value: Math.round(value * 100) / 100,
      percentage: Math.round((value / previous.flipkartPrice) * 10000) / 100
    }
  }

  if (latest.ebayPrice && previous.ebayPrice) {
    const value = latest.ebayPrice - previous.ebayPrice
    changes.ebay = {
      value: Math.round(value * 100) / 100,
      percentage: Math.round((value / previous.ebayPrice) * 10000) / 100
    }
  }

  return changes
}

// GET price history for a specific product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const productName = searchParams.get('productName') || 'Unknown Product'
    const days = parseInt(searchParams.get('days') || '30')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Generate or fetch price history
    const history = generatePriceHistory(productName, days)
    const latestEntry = history[history.length - 1]
    const priceChanges = calculatePriceChanges(history)

    const response: ProductPriceHistory = {
      productId,
      productName,
      currentPrices: {
        amazon: latestEntry.amazonPrice,
        flipkart: latestEntry.flipkartPrice,
        ebay: latestEntry.ebayPrice,
      },
      history,
      priceChange: priceChanges,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Price history API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}

// POST to update/add price data (for real-time monitoring)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, productName, prices } = body

    if (!productId || !prices) {
      return NextResponse.json(
        { error: 'Product ID and prices are required' },
        { status: 400 }
      )
    }

    // In a real implementation, this would:
    // 1. Store the new price data in the database
    // 2. Update the price history
    // 3. Trigger notifications for price drops/increases
    // 4. Update any user watchlists

    console.log(`Price update for ${productId}:`, prices)

    // For now, return a success response
    return NextResponse.json({
      success: true,
      message: 'Price data updated',
      productId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Price update API error:', error)
    return NextResponse.json(
      { error: 'Failed to update price data' },
      { status: 500 }
    )
  }
}
