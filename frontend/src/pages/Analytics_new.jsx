import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { transactionAPI } from '../utils/api';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  BarChart,
  Bar
} from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('6months');

  // Fetch all transactions for analytics
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions', 'analytics'],
    queryFn: () => transactionAPI.getAll({ limit: 1000 })
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <TrendingDown className="h-12 w-12 mx-auto mb-2" />
            <p>Failed to load analytics data</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Process data for charts
  const processedData = React.useMemo(() => {
    if (!transactions) return { monthlyData: [], categoryData: [], totalStats: {} };

    // Get monthly trends for the last 6 months
    const monthlyData = [];
    const categoryTotals = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyData.push({
        month: format(date, 'MMM yyyy'),
        income: monthIncome,
        expenses: monthExpenses,
        net: monthIncome - monthExpenses
      });
    }

    // Process category data
    transactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        const category = transaction.category || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
      }
      
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
    });

    const categoryData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories

    return {
      monthlyData,
      categoryData,
      totalStats: {
        totalIncome,
        totalExpenses,
        netWorth: totalIncome - totalExpenses,
        avgMonthlyIncome: totalIncome / 6,
        avgMonthlyExpenses: totalExpenses / 6
      }
    };
  }, [transactions]);

  const { monthlyData, categoryData, totalStats } = processedData;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">
              Insights into your financial patterns and trends
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label">Total Income</div>
                <div className="stat-value text-green-600">
                  ₹{totalStats.totalIncome?.toLocaleString('en-IN') || '0'}
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label">Total Expenses</div>
                <div className="stat-value text-red-600">
                  ₹{totalStats.totalExpenses?.toLocaleString('en-IN') || '0'}
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label">Net Worth</div>
                <div className={`stat-value ${totalStats.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{totalStats.netWorth?.toLocaleString('en-IN') || '0'}
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-label">Avg Monthly Exp</div>
                <div className="stat-value text-orange-600">
                  ₹{totalStats.avgMonthlyExpenses?.toLocaleString('en-IN') || '0'}
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trends Chart */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Monthly Trends</h2>
              <p className="text-sm text-gray-500">Income vs Expenses over the last 6 months</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, '']}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  name="Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  name="Expenses"
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Net"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Expense Categories</h2>
                <p className="text-sm text-gray-500">Breakdown by category</p>
              </div>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Categories List */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Top Expense Categories</h2>
                <p className="text-sm text-gray-500">Your biggest spending areas</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {categoryData.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium text-gray-900">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      ₹{category.value.toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {totalStats.totalExpenses > 0 ? ((category.value / totalStats.totalExpenses) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Spending Pattern</h3>
              <p className="text-sm text-blue-700">
                Your average monthly expenses are ₹{totalStats.avgMonthlyExpenses?.toLocaleString('en-IN')}. 
                {totalStats.avgMonthlyExpenses > totalStats.avgMonthlyIncome ? 
                  ' Consider reducing expenses to improve your financial health.' :
                  ' You\'re maintaining a healthy spending pattern.'
                }
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Savings Rate</h3>
              <p className="text-sm text-green-700">
                {totalStats.netWorth >= 0 ? 
                  `Great job! You've saved ₹${totalStats.netWorth.toLocaleString('en-IN')} overall.` :
                  `You're spending ₹${Math.abs(totalStats.netWorth).toLocaleString('en-IN')} more than you earn. Consider budget optimization.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
