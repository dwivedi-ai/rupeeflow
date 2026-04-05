import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { transactionAPI } from '../utils/api';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MoreHorizontal,
  Zap
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Fetch recent transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionAPI.getAll({ limit: 6 }),
  });

  // Also fetch all transactions for current month for accurate count
  const { data: currentMonthTransactions, isLoading: currentMonthTransactionsLoading } = useQuery({
    queryKey: ['transactions', 'current-month'],
    queryFn: () => transactionAPI.getAll({ 
      limit: 1000,
      start_date: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
    }),
  });

  // Fetch current month stats
  const currentMonth = new Date();
  const { data: currentStats, isLoading: currentStatsLoading } = useQuery({
    queryKey: ['transactions', 'stats', 'current'],
    queryFn: () => transactionAPI.getStats({
      start_date: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
    }),
  });

  // Fetch previous month stats for comparison
  const previousMonth = subMonths(currentMonth, 1);
  const { data: previousStats } = useQuery({
    queryKey: ['transactions', 'stats', 'previous'],
    queryFn: () => transactionAPI.getStats({
      start_date: format(startOfMonth(previousMonth), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(previousMonth), 'yyyy-MM-dd'),
    }),
  });

  const isLoading = transactionsLoading || currentStatsLoading || currentMonthTransactionsLoading;

  // Calculate transaction counts from current month transactions
  const currentMonthTransactionList = currentMonthTransactions?.data || currentMonthTransactions || [];
  const totalTransactions = currentMonthTransactionList.length;
  const incomeTransactions = currentMonthTransactionList.filter(t => t.type === 'INCOME').length;
  const expenseTransactions = currentMonthTransactionList.filter(t => t.type === 'EXPENSE').length;

  // Calculate percentage changes
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = calculateChange(
    currentStats?.total_income || 0,
    previousStats?.total_income || 0
  );
  
  const expenseChange = calculateChange(
    currentStats?.total_expense || 0,
    previousStats?.total_expense || 0
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const stats = [
    {
      title: 'Total Balance',
      value: `₹${((currentStats?.total_income || 0) - (currentStats?.total_expense || 0)).toLocaleString()}`,
      icon: Wallet,
      bgColor: 'bg-primary-100',
      iconColor: 'text-primary-600',
      change: null,
    },
    {
      title: 'Income',
      value: `₹${(currentStats?.total_income || 0).toLocaleString()}`,
      icon: TrendingUp,
      bgColor: 'bg-success-100',
      iconColor: 'text-success-600',
      change: incomeChange,
      changePositive: incomeChange >= 0,
    },
    {
      title: 'Expenses',
      value: `₹${(currentStats?.total_expense || 0).toLocaleString()}`,
      icon: TrendingDown,
      bgColor: 'bg-danger-100',
      iconColor: 'text-danger-600',
      change: expenseChange,
      changePositive: expenseChange <= 0, // Lower expenses are good
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back! Here's your financial overview for {format(currentMonth, 'MMMM yyyy')}.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/transactions/add')}
            className="btn btn-secondary btn-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
          <button
            onClick={() => navigate('/transactions/smart-add')}
            className="btn btn-primary btn-sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Smart Add
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  {stat.change !== null && (
                    <div className="flex items-center mt-2">
                      {stat.changePositive ? (
                        <ArrowUpRight className="h-4 w-4 text-success-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-danger-600" />
                      )}
                      <span className={`text-sm font-medium ml-1 ${
                        stat.changePositive ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {Math.abs(stat.change).toFixed(1)}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs last month</span>
                    </div>
                  )}
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <button
              onClick={() => navigate('/transactions')}
              className="btn btn-secondary btn-sm"
            >
              View All
            </button>
          </div>
        </div>
        
        <div className="card-content">
          {transactions && transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.slice(0, 6).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'INCOME' ? 'bg-success-100' : 'bg-danger-100'
                    }`}>
                      {transaction.type === 'INCOME' ? (
                        <ArrowUpRight className={`h-5 w-5 ${
                          transaction.type === 'INCOME' ? 'text-success-600' : 'text-danger-600'
                        }`} />
                      ) : (
                        <ArrowDownRight className={`h-5 w-5 ${
                          transaction.type === 'INCOME' ? 'text-success-600' : 'text-danger-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{transaction.category}</span>
                        <span>•</span>
                        <span>{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${
                      transaction.type === 'INCOME' ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {transaction.type === 'INCOME' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                    </span>
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-500 mb-6">
                Start by adding your first transaction to see your financial overview.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/transactions/add')}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </button>
                <button
                  onClick={() => navigate('/transactions/smart-add')}
                  className="btn btn-secondary"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Try Smart Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/transactions/add')}
                className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="bg-primary-100 p-2 rounded-lg mr-3">
                  <Plus className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add Transaction</p>
                  <p className="text-sm text-gray-500">Manually add income or expense</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/transactions/smart-add')}
                className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Smart Add</p>
                  <p className="text-sm text-gray-500">Use natural language to add transactions</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/transactions')}
                className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="bg-gray-100 p-2 rounded-lg mr-3">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View All Transactions</p>
                  <p className="text-sm text-gray-500">Browse and manage all transactions</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">This Month Summary</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Transactions</span>
                <span className="font-semibold text-gray-900">
                  {totalTransactions}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Income Transactions</span>
                <span className="font-semibold text-success-600">
                  {incomeTransactions}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Expense Transactions</span>
                <span className="font-semibold text-danger-600">
                  {expenseTransactions}
                </span>
              </div>
              
              <hr className="my-3" />
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Net Amount</span>
                <span className={`font-bold ${
                  ((currentStats?.total_income || 0) - (currentStats?.total_expense || 0)) >= 0
                    ? 'text-success-600'
                    : 'text-danger-600'
                }`}>
                  ₹{((currentStats?.total_income || 0) - (currentStats?.total_expense || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
