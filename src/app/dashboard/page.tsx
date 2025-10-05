"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import {
  CreditCardIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline"

interface DashboardStats {
  totalExpenses: number
  monthlyBudget: number
  budgetUsed: number
  totalReceipts: number
  recentExpenses: any[]
  activeBudgets: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlyBudget: 0,
    budgetUsed: 0,
    totalReceipts: 0,
    recentExpenses: [],
    activeBudgets: 0,
  })
  const [allBudgets, setAllBudgets] = useState<any[]>([])
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  const [allReceipts, setAllReceipts] = useState<any[]>([])
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const calculateStats = (expenses: any[], budgets: any[], receipts: any[], selectedBudgetIds: string[]) => {
    // If no budgets selected, show all budgets
    const filteredBudgets = selectedBudgetIds.length === 0 
      ? budgets 
      : budgets.filter(budget => selectedBudgetIds.includes(budget.id))
    
    // Filter expenses to only those linked to filtered budgets (if any budgets selected)
    const filteredExpenses = selectedBudgetIds.length === 0
      ? expenses
      : expenses.filter(expense => 
          expense.budgetId && selectedBudgetIds.includes(expense.budgetId)
        )
    
    // Calculate stats based on filtered data
    const totalExpenses = selectedBudgetIds.length === 0 
      ? expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0)
      : filteredExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0)
    const totalBudget = filteredBudgets.reduce((sum: number, budget: any) => sum + budget.amount, 0)
    const totalBudgetSpent = filteredBudgets.reduce((sum: number, budget: any) => sum + (budget.spent || 0), 0)
    const budgetUsed = totalBudget > 0 ? (totalBudgetSpent / totalBudget) * 100 : 0
    const recentExpenses = filteredExpenses.slice(0, 5)

    setStats({
      totalExpenses,
      monthlyBudget: totalBudget || (budgets.length > 0 ? budgets.reduce((sum: number, budget: any) => sum + budget.amount, 0) : 1000),
      budgetUsed,
      totalReceipts: receipts.length,
      recentExpenses,
      activeBudgets: filteredBudgets.length,
    })
    setIsLoading(false)
  }

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    
    // Fetch dashboard data
    fetchDashboardData()
  }, [status, router])

  // Recalculate stats when budget selection changes
  useEffect(() => {
    if (allBudgets.length > 0 && allExpenses.length >= 0) {
      calculateStats(allExpenses, allBudgets, allReceipts, selectedBudgets)
    }
  }, [selectedBudgets, allBudgets, allExpenses, allReceipts])

  const fetchDashboardData = async () => {
    try {
      // Recalculate budget spending first to ensure data consistency
      await fetch('/api/budgets/recalculate', { method: 'POST' })
      
      // Fetch expenses and budgets from API
      const [expensesRes, budgetsRes, receiptsRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/budgets'),
        fetch('/api/receipts')
      ])

      const expenses = expensesRes.ok ? await expensesRes.json() : []
      const budgets = budgetsRes.ok ? await budgetsRes.json() : []
      const receipts = receiptsRes.ok ? await receiptsRes.json() : []

      // Store raw data
      setAllExpenses(expenses)
      setAllBudgets(budgets)
      setAllReceipts(receipts)
      
      // Calculate stats for all budgets initially
      calculateStats(expenses, budgets, receipts, [])
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      // Fallback to default data
      setStats({
        totalExpenses: 0,
        monthlyBudget: 1000,
        budgetUsed: 0,
        totalReceipts: 0,
        recentExpenses: [],
        activeBudgets: 0,
      })
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
    </div>
  }

  if (status === "unauthenticated") {
    return null
  }

  const stats_cards = [
    {
      name: "Total Expenses",
      stat: `₹${stats.totalExpenses.toFixed(2)}`,
      icon: CreditCardIcon,
      change: "+12%",
      changeType: "increase",
    },
    {
      name: "Monthly Budget",
      stat: `₹${stats.monthlyBudget.toFixed(2)}`,
      icon: ChartBarIcon,
      change: `${stats.budgetUsed.toFixed(1)}% used`,
      changeType: stats.budgetUsed > 90 ? "decrease" : "increase",
    },
    {
      name: "Receipts Processed",
      stat: stats.totalReceipts.toString(),
      icon: DocumentTextIcon,
      change: "+3 this week",
      changeType: "increase",
    },
    {
      name: "Savings Goal",
      stat: "67%",
      icon: ArrowTrendingUpIcon,
      change: "+5% this month",
      changeType: "increase",
    },
  ]

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {selectedBudgets.length > 0 
                ? `Viewing ${selectedBudgets.length} selected budget${selectedBudgets.length > 1 ? 's' : ''}: ${allBudgets.filter(b => selectedBudgets.includes(b.id)).map(b => b.name).join(', ')}`
                : 'Track your monthly spending and stay on budget.'
              }
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
              onClick={() => router.push('/dashboard/expenses')}
            >
              Add Transaction
            </button>
          </div>
        </div>

        {/* Budget Filter Section */}
        {allBudgets.length > 0 && (
          <div className="mt-6">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filter by Budget</h3>
                {selectedBudgets.length > 0 && (
                  <button
                    onClick={() => setSelectedBudgets([])}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    Clear Selection ({selectedBudgets.length})
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBudgets.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBudgets([])
                      }
                    }}
                    className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800"
                  />
                  <span className="ml-3 text-gray-300 font-medium">All Budgets</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allBudgets.map((budget) => {
                    const isSelected = selectedBudgets.includes(budget.id)
                    const remaining = budget.amount - (budget.spent || 0)
                    const percentage = budget.amount > 0 ? ((budget.spent || 0) / budget.amount) * 100 : 0
                    
                    return (
                      <label 
                        key={budget.id}
                        className={`flex items-center p-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected 
                            ? 'border-cyan-500 bg-cyan-500/10' 
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBudgets(prev => [...prev, budget.id])
                            } else {
                              setSelectedBudgets(prev => prev.filter(id => id !== budget.id))
                            }
                          }}
                          className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800"
                        />
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium truncate">{budget.name}</span>
                            <span className={`text-sm ${
                              percentage > 90 ? 'text-red-400' : 
                              percentage > 75 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            ₹{budget.spent?.toFixed(0) || '0'} / ₹{budget.amount.toFixed(0)} 
                            {budget.categoryName && ` • ${budget.categoryName}`}
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                percentage > 90 ? 'bg-red-500' : 
                                percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Usage Section */}
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              {selectedBudgets.length > 0 ? 'Selected Budget Usage' : 'Overall Budget Usage'}
            </h2>
            <div className="text-right mb-2">
              <span className="text-2xl font-bold text-cyan-400">{stats.budgetUsed.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.budgetUsed, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-gray-400 text-sm">
              <span>
                {selectedBudgets.length > 0 
                  ? `Selected Budget Spent: ₹${(stats.monthlyBudget * (stats.budgetUsed / 100)).toFixed(0)} / ₹${stats.monthlyBudget.toFixed(0)}`
                  : `Budget Spent: ₹${(stats.monthlyBudget * (stats.budgetUsed / 100)).toFixed(0)} / ₹${stats.monthlyBudget.toFixed(0)}`
                }
              </span>
              <span className="text-white cursor-pointer">👋</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">
                {selectedBudgets.length > 0 ? 'Selected Budget Spent' : 'Budget Spent'}
              </div>
              <div className="text-3xl font-bold text-white">₹{(stats.monthlyBudget * (stats.budgetUsed / 100)).toFixed(0)}</div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">
                {selectedBudgets.length > 0 ? 'Selected Budget Remaining' : 'Remaining Budget'}
              </div>
              <div className="text-3xl font-bold text-green-400">₹{(stats.monthlyBudget - (stats.monthlyBudget * (stats.budgetUsed / 100))).toFixed(0)}</div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">
                {selectedBudgets.length > 0 ? 'Selected Budget Expenses' : 'Total Expenses'}
              </div>
              <div className="text-3xl font-bold text-blue-400">₹{stats.totalExpenses.toFixed(0)}</div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">
                {selectedBudgets.length > 0 ? 'Selected Budgets' : 'Active Budgets'}
              </div>
              <div className="text-3xl font-bold text-white">{stats.activeBudgets}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button 
            onClick={() => router.push('/dashboard/expenses')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Add Transaction
          </button>
          <button 
            onClick={() => router.push('/dashboard/receipts')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            View Reports
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <div className="sm:flex sm:items-center mb-6">
            <div className="sm:flex-auto">
              <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
              <p className="mt-2 text-sm text-gray-400">
                Your latest spending activity
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
                onClick={() => router.push('/dashboard/expenses')}
              >
                View all
              </button>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center">
                        <div className="animate-pulse text-gray-400">Loading...</div>
                      </td>
                    </tr>
                  ) : stats.recentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No recent expenses. Add your first expense to get started!
                      </td>
                    </tr>
                  ) : (
                    stats.recentExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-750 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {expense.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-900 text-cyan-300">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          ₹{expense.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
