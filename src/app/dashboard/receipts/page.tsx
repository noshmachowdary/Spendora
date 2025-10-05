"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { CloudArrowUpIcon, DocumentTextIcon, CameraIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import { visionReceiptReader } from '@/lib/visionReceiptReader'
import { currencyService } from '@/lib/currencyConverter'

interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  currency: string
  formattedUnitPrice?: string
  formattedTotalPrice?: string
}

interface Receipt {
  id: string
  fileName: string
  filePath: string
  fileType: string
  extractedText?: string
  vendor?: string
  totalAmount?: number
  date?: string
  processed: boolean
  createdAt: string
  items?: ReceiptItem[]
  storeName?: string
  storeAddress?: string
  receiptNumber?: string
  paymentMethod?: string
  formattedTotal?: string
  ocrConfidence?: number
  processingTime?: number
}

export default function ReceiptsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    loadReceipts()
  }, [status, router])

  const loadReceipts = async () => {
    try {
      // Mock data for demonstration
      // Start with empty receipts - user will upload their own
      setTimeout(() => {
        setReceipts([])
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error('Error loading receipts:', error)
      setIsLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files) {
      await handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    setIsUploading(true)
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Please upload only image files (JPEG, PNG) or PDF files.')
        continue
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.')
        continue
      }

      // Create mock receipt entry
      const newReceipt: Receipt = {
        id: Date.now().toString() + i,
        fileName: file.name,
        filePath: `/uploads/receipts/${file.name}`,
        fileType: file.type,
        processed: false,
        createdAt: new Date().toISOString(),
      }

      // Add to receipts list
      setReceipts(prev => [newReceipt, ...prev])

      // Simulate OCR processing
      setTimeout(() => {
        processReceiptOCR(newReceipt.id, file)
      }, 2000)
    }
    
    setIsUploading(false)
  }

  const createExpenseFromReceipt = (receipt: Receipt) => {
    // Navigate to expenses page with pre-filled data
    const params = new URLSearchParams({
      description: receipt.vendor || receipt.fileName,
      amount: receipt.totalAmount?.toString() || '',
      date: receipt.date || new Date().toISOString().split('T')[0],
    })
    router.push(`/dashboard/expenses?${params.toString()}`)
  }

  const processReceiptOCR = async (receiptId: string, file: File) => {
    try {
      console.log('🧠 Starting AI vision analysis for:', file.name)
      
      // Step 1: Analyze image using AI vision (like how I read images)
      const visionResult = await visionReceiptReader.analyzeReceipt(file)
      console.log('✅ AI vision analysis completed:', {
        storeName: visionResult.storeName,
        total: visionResult.formattedTotal,
        itemCount: visionResult.items.length,
        confidence: visionResult.confidence
      })
      
      // Step 2: Format the results for display
      const formattedItems = visionResult.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        currency: 'INR',
        formattedPrice: item.formattedPrice,
        formattedUnitPrice: `₹${item.unitPrice.toFixed(2)}`,
        formattedTotalPrice: item.formattedPrice
      }))
      
      // Update receipt with vision analysis results
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId 
          ? { 
              ...receipt,
              extractedText: `AI Vision Analysis Complete\n\nStore: ${visionResult.storeName}\nDate: ${visionResult.date}\nItems: ${visionResult.items.length}\nTotal: ${visionResult.formattedTotal}\nPayment: ${visionResult.paymentMethod}`,
              vendor: visionResult.storeName,
              storeName: visionResult.storeName,
              storeAddress: visionResult.storeAddress,
              totalAmount: visionResult.total,
              formattedTotal: visionResult.formattedTotal,
              date: visionResult.date,
              items: formattedItems,
              receiptNumber: visionResult.receiptNumber,
              paymentMethod: visionResult.paymentMethod,
              ocrConfidence: visionResult.confidence,
              processingTime: 1500, // Simulated processing time
              processed: true 
            }
          : receipt
      ))
      
    } catch (error) {
      console.error('❌ AI vision analysis failed:', error)
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId 
          ? { 
              ...receipt, 
              processed: true, 
              extractedText: `AI vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              vendor: 'Processing Failed'
            }
          : receipt
      ))
    }
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
            <h1 className="text-3xl font-bold text-white">Receipt Scanner</h1>
            <p className="mt-2 text-sm text-gray-400">
              Upload receipts and automatically extract expense details using AI Vision
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
          <div 
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-colors duration-200 ${
              dragActive 
                ? 'border-cyan-400 bg-cyan-900/20' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="text-center">
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-lg font-medium text-white">
                  {isUploading ? 'Uploading...' : 'Drop receipt files here'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  or click to browse (JPEG, PNG, PDF up to 10MB)
                </p>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-cyan-500 hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors duration-200"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  {isUploading ? 'Processing...' : 'Select Files'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts List */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">Recent Receipts</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-gray-400">Loading receipts...</div>
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-2xl border border-gray-700">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-400">No receipts</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by uploading your first receipt.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-8 w-8 text-cyan-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-white truncate max-w-40">
                          {receipt.fileName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      receipt.processed 
                        ? 'bg-green-900 text-green-300'
                        : 'bg-yellow-900 text-yellow-300'
                    }`}>
                      {receipt.processed ? 'Processed' : 'Processing...'}
                    </span>
                  </div>
                  
                  {receipt.processed && receipt.vendor && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400">Vendor</p>
                        <p className="text-sm text-white font-medium">{receipt.vendor}</p>
                        {receipt.storeAddress && (
                          <p className="text-xs text-gray-400 mt-1">{receipt.storeAddress}</p>
                        )}
                      </div>
                      
                      {(receipt.totalAmount || receipt.formattedTotal) && (
                        <div>
                          <p className="text-xs text-gray-400">Amount</p>
                          <p className="text-lg text-cyan-400 font-bold">
                            {receipt.formattedTotal || `₹${receipt.totalAmount.toFixed(2)}`}
                          </p>
                        </div>
                      )}
                      
                      {receipt.date && (
                        <div>
                          <p className="text-xs text-gray-400">Date</p>
                          <p className="text-sm text-white">{new Date(receipt.date).toLocaleDateString()}</p>
                        </div>
                      )}
                      
                      {/* Show additional receipt details */}
                      {(receipt.receiptNumber || receipt.paymentMethod) && (
                        <div className="flex space-x-4 text-xs">
                          {receipt.receiptNumber && (
                            <div>
                              <p className="text-gray-400">Receipt #</p>
                              <p className="text-white">{receipt.receiptNumber}</p>
                            </div>
                          )}
                          {receipt.paymentMethod && (
                            <div>
                              <p className="text-gray-400">Payment</p>
                              <p className="text-white">{receipt.paymentMethod}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show OCR confidence if available */}
                      {receipt.ocrConfidence && (
                        <div className="text-xs">
                          <p className="text-gray-400">AI Vision Quality</p>
                          <p className={`${
                            receipt.ocrConfidence > 80 ? 'text-green-400' : 
                            receipt.ocrConfidence > 60 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {receipt.ocrConfidence.toFixed(1)}% confidence
                          </p>
                        </div>
                      )}
                      
                      {/* Show items count if available */}
                      {/*receipt.items && receipt.items.length > 0 && (
                        <div className="bg-gray-700 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-2">Items ({receipt.items.length})</p>
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {receipt.items.slice(0, 3).map((item, index) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span className="text-white truncate pr-2">{item.name}</span>
                                <span className="text-cyan-400 whitespace-nowrap">{item.formattedPrice}</span>
                              </div>
                            ))}
                            {receipt.items.length > 3 && (
                              <p className="text-xs text-gray-400 text-center pt-1">
                                +{receipt.items.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )*/}
                      
                      <button 
                        onClick={() => createExpenseFromReceipt(receipt)}
                        className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        Create Expense
                      </button>
                    </div>
                  )}
                  
                  {!receipt.processed && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                      <span className="ml-2 text-gray-400">AI Vision Processing...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}