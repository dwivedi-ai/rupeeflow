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
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['analytics', 'transactions', timeRange, start, end],
    queryFn: () => transactionAPI.getAll({ 
      start_date: start, 
      end_date: end,
      limit: 1000 
    }),
  });

  const isLoading = statsLoading || transactionsLoading;

  // Calculate category breakdown
  const getCategoryBreakdown = () => {
    if (!transactions) return [];
    
    const categories = {};
    transactions.forEach(transaction => {
      const category = transaction.category || 'Other';
      if (!categories[category]) {
        categories[category] = { income: 0, expense: 0, total: 0 };
      }
      
      if (transaction.type === 'INCOME') {
        categories[category].income += transaction.amount;
      } else {
        categories[category].expense += transaction.amount;
      }
      categories[category].total += transaction.amount;
    });

    return Object.entries(categories)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  };

  // Calculate monthly trends (for current year)
  const getMonthlyTrends = () => {
    if (!transactions) return [];
    
    const months = {};
    transactions.forEach(transaction => {
      const month = format(new Date(transaction.transaction_date), 'MMM yyyy');
      if (!months[month]) {
        months[month] = { income: 0, expense: 0, net: 0 };
      }
      
      if (transaction.type === 'INCOME') {
        months[month].income += transaction.amount;
      } else {
        months[month].expense += transaction.amount;
      }
      months[month].net = months[month].income - months[month].expense;
    });

    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  };

  const categoryBreakdown = getCategoryBreakdown();
  const monthlyTrends = getMonthlyTrends();

  // Calculate savings rate
  const savingsRate = stats?.total_income > 0 
    ? ((stats.total_income - stats.total_expense) / stats.total_income * 100).toFixed(1)
    : 0;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-500">
                Detailed insights into your financial data
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex space-x-2">
            {[
              { key: 'month', label: 'Month' },
              { key: 'year', label: 'Year' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{stats?.total_income?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{stats?.total_expense?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Net Balance</p>
                <p className={`text-2xl font-bold ${
                  (stats?.total_income || 0) - (stats?.total_expense || 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  ₹{((stats?.total_income || 0) - (stats?.total_expense || 0)).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Savings Rate</p>
                <p className={`text-2xl font-bold ${
                  parseFloat(savingsRate) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {savingsRate}%
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-elevated p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-xl">
                <PieChart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
                <p className="text-sm text-gray-500">Spending by category</p>
              </div>
            </div>

            <div className="space-y-4">
              {categoryBreakdown.slice(0, 8).map((category, index) => {
                const colors = [
                  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500',
                  'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
                ];
                const percentage = stats?.total_expense > 0
                  ? (category.expense / stats.total_expense * 100).toFixed(1)
                  : 0;

                return (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                      <span className="text-sm font-medium text-gray-700">{category.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">{percentage}%</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ₹{category.expense.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transaction Volume */}
          <div className="card-elevated p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-green-100 p-3 rounded-xl">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Transaction Activity</h3>
                <p className="text-sm text-gray-500">Transaction counts and averages</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Transactions</span>
                <span className="text-lg font-semibold text-gray-900">
                  {transactions?.length || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Income Transactions</span>
                <span className="text-lg font-semibold text-green-600">
                  {transactions?.filter(t => t.type === 'INCOME').length || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Expense Transactions</span>
                <span className="text-lg font-semibold text-red-600">
                  {transactions?.filter(t => t.type === 'EXPENSE').length || 0}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Average Transaction</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{transactions?.length > 0 
                      ? Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length).toLocaleString()
                      : '0'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trends (if viewing yearly data) */}
        {timeRange === 'year' && monthlyTrends.length > 0 && (
          <div className="card-elevated p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-purple-100 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
                <p className="text-sm text-gray-500">Income vs Expenses by month</p>
              </div>
            </div>

            <div className="space-y-4">
              {monthlyTrends.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{month.month}</span>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-green-600">+₹{month.income.toLocaleString()}</span>
                      <span className="text-red-600">-₹{month.expense.toLocaleString()}</span>
                      <span className={`font-semibold ${month.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {month.net >= 0 ? '+' : ''}₹{month.net.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full"
                      style={{ 
                        width: `${Math.max(month.income / Math.max(month.income + month.expense) * 100, 5)}%` 
                      }}
                    />
                    <div 
                      className="bg-red-500 h-full"
                      style={{ 
                        width: `${Math.max(month.expense / Math.max(month.income + month.expense) * 100, 5)}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Health Score */}
        <div className="card-elevated p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-indigo-100 p-3 rounded-xl">
              <Target className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Financial Health Insights</h3>
              <p className="text-sm text-gray-500">Key recommendations based on your spending</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  parseFloat(savingsRate) >= 20 ? 'bg-green-500' : 
                  parseFloat(savingsRate) >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">
                  Savings Rate: {parseFloat(savingsRate) >= 20 ? 'Excellent' : 
                  parseFloat(savingsRate) >= 10 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  transactions?.length >= 10 ? 'bg-green-500' : 
                  transactions?.length >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">
                  Transaction Activity: {transactions?.length >= 10 ? 'Active' : 
                  transactions?.length >= 5 ? 'Moderate' : 'Low'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {parseFloat(savingsRate) < 10 && (
                <p>💡 Consider reducing discretionary spending to improve your savings rate</p>
              )}
              {categoryBreakdown[0]?.expense > (stats?.total_expense * 0.4) && (
                <p>💡 Your largest expense category ({categoryBreakdown[0]?.name}) takes up {((categoryBreakdown[0]?.expense / stats?.total_expense) * 100).toFixed(0)}% of spending</p>
              )}
              {transactions?.length < 5 && (
                <p>💡 Track more transactions to get better insights into your spending patterns</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
