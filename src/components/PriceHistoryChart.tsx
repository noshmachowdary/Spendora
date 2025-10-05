"use client"

import { useEffect, useRef, useState } from "react"

interface PriceHistoryChartProps {
  priceHistory: Array<{ date: string; price: number }>
  currentPrice: number
  productName: string
}

export default function PriceHistoryChart({
  priceHistory,
  currentPrice,
  productName,
}: PriceHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number
    x: number
    y: number
    date: string
    price: number
  } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || priceHistory.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    setMousePos({ x: event.clientX, y: event.clientY })

    const padding = 40
    const chartWidth = rect.width - 2 * padding
    const chartHeight = rect.height - 2 * padding

    const getX = (i: number) => padding + (i / (priceHistory.length - 1)) * chartWidth
    const prices = priceHistory.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    const getY = (price: number) =>
      padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight

    let closestIndex = -1
    let minDist = Infinity

    priceHistory.forEach((point, i) => {
      const x = getX(i)
      const y = getY(point.price)
      const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2)
      if (dist < minDist && dist < 20) {
        minDist = dist
        closestIndex = i
      }
    })

    if (closestIndex !== -1) {
      const x = getX(closestIndex)
      const y = getY(priceHistory[closestIndex].price)
      setHoveredPoint({
        index: closestIndex,
        x,
        y,
        date: priceHistory[closestIndex].date,
        price: priceHistory[closestIndex].price,
      })
    } else {
      setHoveredPoint(null)
    }
  }

  const handleMouseLeave = () => setHoveredPoint(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || priceHistory.length === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const padding = 40
    const chartWidth = rect.width - 2 * padding
    const chartHeight = rect.height - 2 * padding

    const prices = priceHistory.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    const getX = (i: number) => padding + (i / (priceHistory.length - 1)) * chartWidth
    const getY = (price: number) =>
      padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight

    // Grid
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i / 4) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Line
    ctx.strokeStyle = "#06b6d4"
    ctx.lineWidth = 3
    ctx.beginPath()
    priceHistory.forEach((p, i) => {
      const x = getX(i)
      const y = getY(p.price)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight)
    gradient.addColorStop(0, "rgba(6,182,212,0.3)")
    gradient.addColorStop(1, "rgba(6,182,212,0.05)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    priceHistory.forEach((p, i) => {
      const x = getX(i)
      const y = getY(p.price)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(getX(priceHistory.length - 1), padding + chartHeight)
    ctx.lineTo(getX(0), padding + chartHeight)
    ctx.closePath()
    ctx.fill()

    // Points
    priceHistory.forEach((p, i) => {
      const x = getX(i)
      const y = getY(p.price)
      const isHovered = hoveredPoint?.index === i
      ctx.fillStyle = isHovered ? "#fbbf24" : "#06b6d4"
      ctx.beginPath()
      ctx.arc(x, y, isHovered ? 6 : 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Current price indicator
    const currentY = getY(currentPrice)
    ctx.strokeStyle = "#10b981"
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(padding, currentY)
    ctx.lineTo(padding + chartWidth, currentY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "#10b981"
    ctx.fillText(`Current: ₹${currentPrice.toLocaleString()}`, padding + 10, currentY - 10)
  }, [priceHistory, currentPrice, hoveredPoint])

  // Change %
  const priceChange =
    priceHistory.length > 1
      ? ((priceHistory.at(-1)!.price - priceHistory[0].price) / priceHistory[0].price) * 100
      : 0
  const changeColor = priceChange >= 0 ? "text-green-400" : "text-red-400"
  const changeIcon = priceChange >= 0 ? "↗️" : "↘️"

  return (
    <div ref={wrapperRef} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Price History</h3>
          <p className="text-gray-400 text-sm">Last 30 days trend for {productName}</p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${changeColor}`}>
            {changeIcon} {Math.abs(priceChange).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">30-day change</div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-64 rounded-lg bg-gray-900/20 cursor-crosshair"
        style={{ width: "100%", height: "256px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {priceHistory.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">Loading price history...</p>
        </div>
      )}

      {hoveredPoint && (
        <div
          className="absolute z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl pointer-events-none"
          style={{
            left: hoveredPoint.x + 20,
            top: hoveredPoint.y,
          }}
        >
          <div className="text-white text-sm font-medium">
            ₹{hoveredPoint.price.toLocaleString()}
          </div>
          <div className="text-gray-400 text-xs">
            {new Date(hoveredPoint.date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      )}
    </div>
  )
}
