import { NextRequest, NextResponse } from 'next/server'

interface PriceAlert {
  id: string
  productId: string
  productName: string
  userId: string
  targetPrice: number
  platform: 'amazon' | 'flipkart' | 'ebay' | 'any'
  isActive: boolean
  createdAt: string
  lastTriggered?: string
}

interface MonitoredProduct {
  id: string
  name: string
  currentPrices: {
    amazon?: number
    flipkart?: number
    ebay?: number
  }
  alerts: PriceAlert[]
  lastUpdated: string
}

// In-memory storage (in production, use a database)
const monitoredProducts = new Map<string, MonitoredProduct>()
const priceAlerts = new Map<string, PriceAlert>()

// GET - Retrieve monitored products and alerts for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const productId = searchParams.get('productId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (productId) {
      // Get specific product monitoring info
      const product = monitoredProducts.get(productId)
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      const userAlerts = product.alerts.filter(alert => alert.userId === userId)
      return NextResponse.json({
        product,
        alerts: userAlerts
      })
    }

    // Get all monitored products for user
    const userProducts: MonitoredProduct[] = []
    for (const product of monitoredProducts.values()) {
      const userAlerts = product.alerts.filter(alert => alert.userId === userId)
      if (userAlerts.length > 0) {
        userProducts.push({
          ...product,
          alerts: userAlerts
        })
      }
    }

    return NextResponse.json({
      products: userProducts,
      totalAlerts: userProducts.reduce((sum, p) => sum + p.alerts.length, 0)
    })
  } catch (error) {
    console.error('Monitor GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve monitoring data' }, { status: 500 })
  }
}

// POST - Create a price alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, productName, userId, targetPrice, platform = 'any' } = body

    if (!productId || !productName || !userId || !targetPrice) {
      return NextResponse.json(
        { error: 'Product ID, name, user ID, and target price are required' },
        { status: 400 }
      )
    }

    // Create new alert
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newAlert: PriceAlert = {
      id: alertId,
      productId,
      productName,
      userId,
      targetPrice: parseFloat(targetPrice),
      platform,
      isActive: true,
      createdAt: new Date().toISOString()
    }

    priceAlerts.set(alertId, newAlert)

    // Add to monitored product or create new one
    let product = monitoredProducts.get(productId)
    if (!product) {
      // Fetch current prices (this would normally call the scraping API)
      const currentPrices = await fetchCurrentPrices(productName)
      
      product = {
        id: productId,
        name: productName,
        currentPrices,
        alerts: [newAlert],
        lastUpdated: new Date().toISOString()
      }
    } else {
      product.alerts.push(newAlert)
    }

    monitoredProducts.set(productId, product)

    // Check if the alert should be triggered immediately
    const shouldTrigger = checkPriceAlert(newAlert, product.currentPrices)
    
    return NextResponse.json({
      success: true,
      alert: newAlert,
      shouldTrigger,
      message: shouldTrigger 
        ? 'Alert created and triggered immediately - price target met!' 
        : 'Price alert created successfully'
    })
  } catch (error) {
    console.error('Monitor POST error:', error)
    return NextResponse.json({ error: 'Failed to create price alert' }, { status: 500 })
  }
}

// PUT - Update a price alert
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, targetPrice, platform, isActive } = body

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const alert = priceAlerts.get(alertId)
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Update alert properties
    if (targetPrice !== undefined) alert.targetPrice = parseFloat(targetPrice)
    if (platform !== undefined) alert.platform = platform
    if (isActive !== undefined) alert.isActive = isActive

    priceAlerts.set(alertId, alert)

    // Update in monitored products
    const product = monitoredProducts.get(alert.productId)
    if (product) {
      const alertIndex = product.alerts.findIndex(a => a.id === alertId)
      if (alertIndex !== -1) {
        product.alerts[alertIndex] = alert
        monitoredProducts.set(alert.productId, product)
      }
    }

    return NextResponse.json({
      success: true,
      alert,
      message: 'Price alert updated successfully'
    })
  } catch (error) {
    console.error('Monitor PUT error:', error)
    return NextResponse.json({ error: 'Failed to update price alert' }, { status: 500 })
  }
}

// DELETE - Remove a price alert
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('alertId')

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const alert = priceAlerts.get(alertId)
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Remove from maps
    priceAlerts.delete(alertId)

    // Remove from monitored product
    const product = monitoredProducts.get(alert.productId)
    if (product) {
      product.alerts = product.alerts.filter(a => a.id !== alertId)
      
      // If no more alerts for this product, remove it from monitoring
      if (product.alerts.length === 0) {
        monitoredProducts.delete(alert.productId)
      } else {
        monitoredProducts.set(alert.productId, product)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Price alert removed successfully'
    })
  } catch (error) {
    console.error('Monitor DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove price alert' }, { status: 500 })
  }
}

// Helper function to fetch current prices
async function fetchCurrentPrices(productName: string) {
  try {
    // In production, this would call your scraping APIs
    // For now, return mock data with realistic price variations
    const basePrice = Math.random() * 400 + 200
    return {
      amazon: Math.round((basePrice + (Math.random() - 0.5) * 50) * 100) / 100,
      flipkart: Math.round((basePrice + (Math.random() - 0.5) * 60) * 100) / 100,
      ebay: Math.round((basePrice + (Math.random() - 0.5) * 70) * 100) / 100,
    }
  } catch (error) {
    console.error('Error fetching current prices:', error)
    return {}
  }
}

// Helper function to check if a price alert should trigger
function checkPriceAlert(alert: PriceAlert, currentPrices: any): boolean {
  if (!alert.isActive) return false

  const { targetPrice, platform } = alert

  switch (platform) {
    case 'amazon':
      return currentPrices.amazon && currentPrices.amazon <= targetPrice
    case 'flipkart':
      return currentPrices.flipkart && currentPrices.flipkart <= targetPrice
    case 'ebay':
      return currentPrices.ebay && currentPrices.ebay <= targetPrice
    case 'any':
    default:
      return (
        (currentPrices.amazon && currentPrices.amazon <= targetPrice) ||
        (currentPrices.flipkart && currentPrices.flipkart <= targetPrice) ||
        (currentPrices.ebay && currentPrices.ebay <= targetPrice)
      )
  }
}

// Background function to check all alerts (would be called by a cron job)
export async function checkAllPriceAlerts() {
  const triggeredAlerts: PriceAlert[] = []

  for (const product of monitoredProducts.values()) {
    // Update current prices
    const newPrices = await fetchCurrentPrices(product.name)
    product.currentPrices = newPrices
    product.lastUpdated = new Date().toISOString()

    // Check each alert
    for (const alert of product.alerts) {
      if (checkPriceAlert(alert, newPrices)) {
        alert.lastTriggered = new Date().toISOString()
        triggeredAlerts.push(alert)
        
        // In production, this would:
        // 1. Send email/push notification to user
        // 2. Log the triggered alert
        // 3. Potentially disable the alert or set a cooldown
        console.log(`Price alert triggered for ${alert.productName} - Target: ₹${alert.targetPrice}`)
      }
    }

    monitoredProducts.set(product.id, product)
  }

  return triggeredAlerts
}
