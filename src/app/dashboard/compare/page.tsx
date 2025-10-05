/*"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { MagnifyingGlassIcon, ShoppingCartIcon, ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, EyeIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Product {
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

interface PriceHistory {
  date: string
  amazonPrice?: number
  flipkartPrice?: number
  ebayPrice?: number
}

interface ProductWithHistory extends Product {
  priceHistory?: PriceHistory[]
  priceChange?: {
    amazon?: { value: number; percentage: number }
    flipkart?: { value: number; percentage: number }
    ebay?: { value: number; percentage: number }
  }
  isWatched?: boolean
}

export default function PriceComparePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [products, setProducts] = useState<ProductWithHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [watchedProducts, setWatchedProducts] = useState<string[]>([])
  const [showPriceHistory, setShowPriceHistory] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
  }, [status, router])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setIsLoading(true)
    setHasSearched(true)

    try {
      // Call the real search API
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}&category=${selectedCategory}`)
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        // Fetch price history for each product
        const productsWithHistory = await Promise.all(
          data.products.map(async (product: Product) => {
            try {
              const historyResponse = await fetch(
                `/api/products/price-history?productId=${product.id}&productName=${encodeURIComponent(product.name)}&days=30`
              )
              const historyData = await historyResponse.json()
              
              return {
                ...product,
                priceHistory: historyData.history || [],
                priceChange: historyData.priceChange || {},
                isWatched: watchedProducts.includes(product.id),
              }
            } catch (error) {
              console.error('Failed to fetch price history for', product.id)
              return {
                ...product,
                isWatched: watchedProducts.includes(product.id),
              }
            }
          })
        )
        
        setProducts(productsWithHistory)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching product prices:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleWatchProduct = (productId: string) => {
    setWatchedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
    
    setProducts(prev => prev.map(product => 
      product.id === productId 
        ? { ...product, isWatched: !product.isWatched }
        : product
    ))
  }

  const getBestPrice = (product: ProductWithHistory) => {
    const prices = [product.amazonPrice, product.flipkartPrice, product.ebayPrice].filter(Boolean) as number[]
    return prices.length > 0 ? Math.min(...prices) : null
  }

  const getSavings = (product: ProductWithHistory) => {
    const prices = [product.amazonPrice, product.flipkartPrice, product.ebayPrice].filter(Boolean) as number[]
    if (prices.length < 2) return null
    const max = Math.max(...prices)
    const min = Math.min(...prices)
    return max - min
  }

  const getBestPlatform = (product: ProductWithHistory) => {
    const bestPrice = getBestPrice(product)
    if (!bestPrice) return null
    
    if (product.amazonPrice === bestPrice) return 'Amazon'
    if (product.flipkartPrice === bestPrice) return 'Flipkart' 
    if (product.ebayPrice === bestPrice) return 'eBay'
    return null
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
    </div>
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center mb-8">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-white">Price Comparison</h1>
            <p className="mt-2 text-sm text-gray-400">
              Compare prices across Amazon and Flipkart to find the best deals
            </p>
          </div>
        </div>

        /* Search Form */
/*        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              {/* Search Input */
/*
              <div className="lg:col-span-3 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-2xl leading-5 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm"
                  placeholder="Search for products (e.g., iPhone, Samsung Galaxy, MacBook, Headphones, Shoes, Books...)"
                />
              </div>
              
              {/* Category Filter */
/*
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full py-3 px-4 border border-gray-600 rounded-2xl bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent sm:text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="fashion">Fashion</option>
                  <option value="home">Home & Garden</option>
                  <option value="books">Books</option>
                  <option value="sports">Sports & Outdoors</option>
                  <option value="beauty">Beauty & Health</option>
                  <option value="automotive">Automotive</option>
                  <option value="toys">Toys & Games</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              <button
                type="submit"
                disabled={isLoading || !searchTerm.trim()}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-cyan-500 hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching Across Platforms...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                    Compare Prices
                  </>
                )}
              </button>
              
              {watchedProducts.length > 0 && (
                <div className="flex items-center text-sm text-gray-400">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {watchedProducts.length} watched product{watchedProducts.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Results */
/*
        <div>
          {!hasSearched && !isLoading && (
            <div className="text-center py-12 bg-gray-800 rounded-2xl border border-gray-700">
              <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-400">Start Comparing Prices</h3>
              <p className="mt-1 text-sm text-gray-500">
                Search for any product to compare prices across major e-commerce platforms
              </p>
            </div>
          )}

          {hasSearched && !isLoading && products.length === 0 && (
            <div className="text-center py-12 bg-gray-800 rounded-2xl border border-gray-700">
              <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-400">No Products Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try searching with different keywords or product names
              </p>
            </div>
          )}

          {products.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Price Comparison Results for "{searchTerm}" 
                  <span className="text-sm text-gray-400 font-normal ml-2">({products.length} products found)</span>
                </h2>
              </div>
              
              <div className="space-y-8">
                {products.map((product) => {
                  const bestPrice = getBestPrice(product)
                  const savings = getSavings(product)
                  const bestPlatform = getBestPlatform(product)
                  
                  return (
                    <div key={product.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
/*
                      <div className="p-6 border-b border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <img
                              src={product.imageUrl || 'https://via.placeholder.com/80x80?text=Product'}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg bg-gray-700 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-semibold text-white mb-2">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                                {product.description || 'No description available'}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {product.category && (
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded">
                                    {product.category}
                                  </span>
                                )}
                                {product.rating && (
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-900 text-yellow-300 rounded">
                                    ★ {product.rating.toFixed(1)}
                                  </span>
                                )}
                                {product.reviews && (
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-900 text-blue-300 rounded">
                                    {product.reviews.toLocaleString()} reviews
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => toggleWatchProduct(product.id)}
                              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                product.isWatched 
                                  ? 'bg-cyan-600 text-white' 
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              <EyeIcon className="h-4 w-4" />
                              {product.isWatched ? 'Watching' : 'Watch'}
                            </button>
                            
                            {bestPrice && bestPlatform && (
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Best Price</p>
                                <p className="text-lg font-bold text-green-400">₹{bestPrice.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">on {bestPlatform}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>


                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Platform Prices</h4>
                            

                            {product.amazonPrice && (
                              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                                bestPrice === product.amazonPrice 
                                  ? 'bg-green-900/20 border-green-600' 
                                  : 'bg-gray-700 border-gray-600'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">A</span>
                                  </div>
                                  <div>
                                    <span className="text-white font-medium">Amazon</span>
                                    {product.priceChange?.amazon && (
                                      <div className={`flex items-center gap-1 text-xs ${
                                        product.priceChange.amazon.value >= 0 ? 'text-red-400' : 'text-green-400'
                                      }`}>
                                        {product.priceChange.amazon.value >= 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
                                        {product.priceChange.amazon.percentage.toFixed(1)}%
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-lg font-bold ${
                                    bestPrice === product.amazonPrice ? 'text-green-400' : 'text-white'
                                  }`}>
                                    ₹{product.amazonPrice.toFixed(2)}
                                  </span>
                                  {product.amazonUrl && (
                                    <a
                                      href={product.amazonUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                                    >
                                      Buy Now
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {product.flipkartPrice && (
                              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                                bestPrice === product.flipkartPrice 
                                  ? 'bg-green-900/20 border-green-600' 
                                  : 'bg-gray-700 border-gray-600'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">F</span>
                                  </div>
                                  <div>
                                    <span className="text-white font-medium">Flipkart</span>
                                    {product.priceChange?.flipkart && (
                                      <div className={`flex items-center gap-1 text-xs ${
                                        product.priceChange.flipkart.value >= 0 ? 'text-red-400' : 'text-green-400'
                                      }`}>
                                        {product.priceChange.flipkart.value >= 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
                                        {product.priceChange.flipkart.percentage.toFixed(1)}%
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-lg font-bold ${
                                    bestPrice === product.flipkartPrice ? 'text-green-400' : 'text-white'
                                  }`}>
                                    ₹{product.flipkartPrice.toFixed(2)}
                                  </span>
                                  {product.flipkartUrl && (
                                    <a
                                      href={product.flipkartUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                                    >
                                      Buy Now
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {product.ebayPrice && (
                              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                                bestPrice === product.ebayPrice 
                                  ? 'bg-green-900/20 border-green-600' 
                                  : 'bg-gray-700 border-gray-600'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">E</span>
                                  </div>
                                  <div>
                                    <span className="text-white font-medium">eBay</span>
                                    {product.priceChange?.ebay && (
                                      <div className={`flex items-center gap-1 text-xs ${
                                        product.priceChange.ebay.value >= 0 ? 'text-red-400' : 'text-green-400'
                                      }`}>
                                        {product.priceChange.ebay.value >= 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
                                        {product.priceChange.ebay.percentage.toFixed(1)}%
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-lg font-bold ${
                                    bestPrice === product.ebayPrice ? 'text-green-400' : 'text-white'
                                  }`}>
                                    ₹{product.ebayPrice.toFixed(2)}
                                  </span>
                                  {product.ebayUrl && (
                                    <a
                                      href={product.ebayUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                                    >
                                      Buy Now
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {savings && savings > 0 && (
                              <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
                                <div className="text-center">
                                  <p className="text-sm text-green-400 mb-1">💰 Maximum Savings</p>
                                  <p className="text-2xl font-bold text-green-300">₹{savings.toFixed(2)}</p>
                                  <p className="text-xs text-green-400">
                                    Choose {bestPlatform} over the highest priced option
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {product.priceHistory && product.priceHistory.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-lg font-semibold text-white">30-Day Price Trend</h4>
                                <button
                                  onClick={() => setShowPriceHistory(showPriceHistory === product.id ? null : product.id)}
                                  className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                                >
                                  <ChartBarIcon className="h-4 w-4" />
                                  {showPriceHistory === product.id ? 'Hide Chart' : 'Show Chart'}
                                </button>
                              </div>
                              
                              {showPriceHistory === product.id && (
                                <div className="bg-gray-900 p-4 rounded-lg">
                                  <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={product.priceHistory}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                      <XAxis 
                                        dataKey="date" 
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      />
                                      <YAxis 
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        tickFormatter={(value) => `₹${value}`}
                                      />
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: '#1F2937', 
                                          border: '1px solid #374151',
                                          borderRadius: '0.5rem'
                                        }}
                                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                        formatter={(value: any) => [`₹${value?.toFixed(2)}`, '']}
                                      />
                                      <Legend />
                                      {product.amazonPrice && (
                                        <Line 
                                          type="monotone" 
                                          dataKey="amazonPrice" 
                                          stroke="#F97316" 
                                          strokeWidth={2}
                                          name="Amazon"
                                          connectNulls={false}
                                        />
                                      )}
                                      {product.flipkartPrice && (
                                        <Line 
                                          type="monotone" 
                                          dataKey="flipkartPrice" 
                                          stroke="#3B82F6" 
                                          strokeWidth={2}
                                          name="Flipkart"
                                          connectNulls={false}
                                        />
                                      )}
                                      {product.ebayPrice && (
                                        <Line 
                                          type="monotone" 
                                          dataKey="ebayPrice" 
                                          stroke="#8B5CF6" 
                                          strokeWidth={2}
                                          name="eBay"
                                          connectNulls={false}
                                        />
                                      )}
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
*/