import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { fileName, ocrText } = await request.json()

    console.log('📊 Free OCR processing request:', {
      fileName: fileName || 'unknown',
      textLength: ocrText?.length || 0,
    })

    // -------------------------
    // Extract items with amounts
    // -------------------------
    const lines = ocrText?.split(/\r?\n/) || []
    const itemPattern = /^(.+?)\s*₹\s*([0-9]+(?:\.[0-9]{1,2})?)$/ // text followed by ₹amount

    const items: { item: string; amount: number }[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      const match = trimmed.match(itemPattern)
      if (match) {
        items.push({
          item: match[1].trim(),
          amount: parseFloat(match[2]),
        })
      }
    }

    // Return both logging info and extracted items
    return NextResponse.json({
      success: true,
      message: 'OCR processing completed on client-side',
      processingMode: 'client-side-tesseract',
      timestamp: new Date().toISOString(),
      extractedItems: items,
    })
  } catch (error) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      {
        error: 'Processing failed',
        message: 'OCR processing continues on client-side',
      },
      { status: 200 }
    )
  }
}
