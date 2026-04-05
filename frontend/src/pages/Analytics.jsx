import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionAPI } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Calendar, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Analytics = () => {
  // Fetch all transactions for analytics
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => transactionAPI.getAll({ limit: 1000 }),
  });

  // Process data for analytics
  const analyticsData = useMemo(() => {
    // Handle both direct array and API response object
    const transactionList = transactions?.data || transactions || [];
    console.log('Analytics - transactions data:', transactionList);
    
    if (!Array.isArray(transactionList) || transactionList.length === 0) {
      return null;
    }

    const data = transactionList;
    
    // Calculate totals
    const totalIncome = data
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const totalExpenses = data
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const netIncome = totalIncome - totalExpenses;
    
    // Category breakdown
    const categoryBreakdown = data.reduce((acc, transaction) => {
      const category = transaction.category || 'Other';
      const amount = parseFloat(transaction.amount || 0);
      
      if (!acc[category]) {
        acc[category] = { name: category, value: 0, type: transaction.type };
      }
      acc[category].value += amount;
      return acc;
    }, {});
    
    const categoryData = Object.values(categoryBreakdown);
    
    // Monthly breakdown (last 6 months)
    const endDate = new Date();
    const startDate = subMonths(endDate, 5);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    const monthlyData = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTransactions = data.filter(t => {
        const transactionDate = parseISO(t.transaction_date || t.created_at);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      return {
        month: format(month, 'MMM yyyy'),
        income,
        expenses,
        net: income - expenses
      };
    });
    
    return {
      totalIncome,
      totalExpenses,
      netIncome,
      categoryData,
      monthlyData,
      transactionCount: data.length
    };
  }, [transactions]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">Add some transactions to see your analytics.</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-6 pb-20 max-h-screen overflow-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Insights into your financial patterns</p>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">₹{analyticsData.totalIncome.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">₹{analyticsData.totalExpenses.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className={`text-2xl font-bold ${analyticsData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{analyticsData.netIncome.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.transactionCount}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Net" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Comparison Bar Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses by Month</h3>
        <div className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analyticsData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Analytics;