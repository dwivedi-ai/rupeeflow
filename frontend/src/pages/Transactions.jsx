import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionAPI } from '../utils/api';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  MoreHorizontal,
  Trash2,
  Edit,
  X,
  Zap,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '../components/LoadingSpinner';
import TransactionsPDFDownload from '../components/TransactionsPDFDownload';
import toast from 'react-hot-toast';

const Transactions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch transactions (get all for client-side filtering)
  const { data: allTransactions, isLoading, error } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: () => transactionAPI.getAll({ limit: 1000 }),
  });

  // Client-side filtering and sorting
  const transactions = useMemo(() => {
    if (!allTransactions || !Array.isArray(allTransactions)) return [];
    
    let filtered = [...allTransactions];
    
    // Filter by search term
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.category?.toLowerCase().includes(searchLower) ||
        transaction.amount?.toString().includes(searchLower)
      );
    }
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.transaction_date || a.created_at);
          bValue = new Date(b.transaction_date || b.created_at);
          break;
        case 'amount':
          aValue = parseFloat(a.amount) || 0;
          bValue = parseFloat(b.amount) || 0;
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        default:
          aValue = a.description || '';
          bValue = b.description || '';
      }
      
      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
    
    return filtered;
  }, [allTransactions, debouncedSearchTerm, filterType, sortBy, sortOrder]);

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: (id) => transactionAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transaction deleted successfully!');
      setShowDeleteModal(false);
      setSelectedTransaction(null);
    },
    onError: (error) => {
      console.error('Delete transaction error:', error);
      const message = error.response?.data?.error || 'Failed to delete transaction';
      toast.error(message);
    },
  });

  const handleDeleteTransaction = () => {
    if (selectedTransaction) {
      deleteTransactionMutation.mutate(selectedTransaction.id);
    }
  };

  // Use API-filtered transactions directly instead of client-side filtering
  const filteredTransactions = transactions || [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <X className="h-12 w-12 mx-auto mb-2" />
            <p>Failed to load transactions</p>
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

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">All Transactions</h1>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
              Manage all your income and expense transactions
            </p>
          </div>
          <div className="flex gap-1 sm:gap-3">
            <button
              onClick={() => navigate('/transactions/add')}
              className="btn btn-secondary btn-sm text-xs sm:text-sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={() => navigate('/transactions/smart-add')}
              className="btn btn-primary btn-sm text-xs sm:text-sm"
            >
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Smart Add</span>
              <span className="sm:hidden">Smart</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6">
        {/* Search and Filters with PDF Download */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search and Filters Section */}
          <div className="lg:col-span-3">
            <div className="card-elevated p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn btn-secondary btn-sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="input"
                      >
                        <option value="all">All Transactions</option>
                        <option value="INCOME">Income Only</option>
                        <option value="EXPENSE">Expenses Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="input"
                      >
                        <option value="date">Date</option>
                        <option value="amount">Amount</option>
                        <option value="description">Description</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order
                      </label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="input"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PDF Download Section */}
          <div className="lg:col-span-1">
            <TransactionsPDFDownload />
          </div>
        </div>

        {/* Transactions List */}
        <div className="card-elevated">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Transactions ({filteredTransactions.length})
              </h2>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {filteredTransactions.length > 0 ? (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ${
                        transaction.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'INCOME' ? (
                          <ArrowUpRight className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        ) : (
                          <ArrowDownRight className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                          {transaction.description}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs sm:text-sm text-gray-500">
                          <span className="truncate">{transaction.category || 'Other'}</span>
                          <span className="hidden sm:inline">•</span>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 mt-2 sm:mt-0">
                      <span className={`font-semibold text-sm sm:text-base ${
                        transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'INCOME' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                      </span>
                      
                      <div className="flex items-center space-x-1 sm:space-x-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/transactions/${transaction.id}/edit`)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="Edit Transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowDeleteModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete Transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <MoreHorizontal className="h-4 w-4 text-gray-400 hidden sm:block sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium text-gray-900 mb-1">No transactions found</p>
                  <p className="text-gray-500">
                    {searchTerm || filterType !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Start by adding your first transaction'
                    }
                  </p>
                </div>
                {!searchTerm && filterType === 'all' && (
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Transaction</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedTransaction.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {selectedTransaction.type === 'INCOME' ? (
                      <ArrowUpRight className={`h-4 w-4 ${
                        selectedTransaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    ) : (
                      <ArrowDownRight className={`h-4 w-4 ${
                        selectedTransaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedTransaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {selectedTransaction.type === 'INCOME' ? '+' : '-'}₹{selectedTransaction.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteTransactionMutation.isPending}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTransaction}
                disabled={deleteTransactionMutation.isPending}
                className="btn btn-danger flex-1"
              >
                {deleteTransactionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
