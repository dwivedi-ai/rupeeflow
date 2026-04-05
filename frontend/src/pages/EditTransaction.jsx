import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionAPI } from '../utils/api';
import { ArrowLeft, Save, Trash2, Loader2, DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const EditTransaction = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm();

  const transactionType = watch('type');

  // Fetch transaction data
  const { data: transaction, isLoading, error } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionAPI.getById(id),
    enabled: !!id,
  });

  // Update form with fetched data
  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        transaction_date: transaction.transaction_date,
      });
    }
  }, [transaction, reset]);

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: (transactionData) => transactionAPI.update(id, transactionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['transaction', id]);
      toast.success('Transaction updated successfully!');
      navigate('/transactions');
    },
    onError: (error) => {
      console.error('Update transaction error:', error);
      const message = error.response?.data?.error || 'Failed to update transaction';
      toast.error(message);
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: () => transactionAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transaction deleted successfully!');
      navigate('/transactions');
    },
    onError: (error) => {
      console.error('Delete transaction error:', error);
      const message = error.response?.data?.error || 'Failed to delete transaction';
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    const transactionData = {
      ...data,
      amount: parseFloat(data.amount),
    };
    updateTransactionMutation.mutate(transactionData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      deleteTransactionMutation.mutate();
    }
  };

  const categories = {
    INCOME: [
      'Salary',
      'Freelance',
      'Business',
      'Investment',
      'Rental',
      'Gift',
      'Refund',
      'Cashback',
      'Other',
    ],
    EXPENSE: [
      'Food & Dining',
      'Groceries',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Travel',
      'Insurance',
      'Investment',
      'Other',
    ],
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/transactions')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Transaction Not Found</h1>
              <p className="text-sm text-gray-500">
                The transaction you're looking for doesn't exist
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="card-elevated p-6 text-center">
              <p className="text-gray-600 mb-4">
                The transaction you're looking for doesn't exist or has been deleted.
              </p>
              <button
                onClick={() => navigate('/transactions')}
                className="btn btn-primary"
              >
                Back to Transactions
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/transactions')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Edit Transaction</h1>
            <p className="text-sm text-gray-500">
              Update the details of your transaction
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Form Card */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Save className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Transaction Details
                  </h2>
                  <p className="text-sm text-gray-500">Update the information below</p>
                </div>
              </div>
              
              <button
                onClick={handleDelete}
                disabled={deleteTransactionMutation.isPending || updateTransactionMutation.isPending}
                className="btn btn-danger btn-sm"
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`relative flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    transactionType === 'INCOME'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      {...register('type', { required: 'Transaction type is required' })}
                      type="radio"
                      value="INCOME"
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className={`w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                        transactionType === 'INCOME' ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Income</span>
                    </div>
                  </label>
                  <label className={`relative flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    transactionType === 'EXPENSE'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      {...register('type', { required: 'Transaction type is required' })}
                      type="radio"
                      value="EXPENSE"
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className={`w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                        transactionType === 'EXPENSE' ? 'bg-red-500' : 'bg-gray-400'
                      }`}>
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-gray-900">Expense</span>
                    </div>
                  </label>
                </div>
                {errors.type && (
                  <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('amount', {
                      required: 'Amount is required',
                      min: {
                        value: 0.01,
                        message: 'Amount must be greater than 0',
                      },
                    })}
                    type="number"
                    step="0.01"
                    className={`input pl-10 ${errors.amount ? 'input-error' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-2 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('description', {
                      required: 'Description is required',
                    })}
                    type="text"
                    className={`input pl-10 ${errors.description ? 'input-error' : ''}`}
                    placeholder="Enter description"
                  />
                </div>
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    {...register('category')}
                    className="input pl-10"
                  >
                    <option value="">Select a category</option>
                    {categories[transactionType]?.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transaction Date */}
              <div>
                <label htmlFor="transaction_date" className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('transaction_date', {
                      required: 'Transaction date is required',
                    })}
                    type="date"
                    className={`input pl-10 ${errors.transaction_date ? 'input-error' : ''}`}
                  />
                </div>
                {errors.transaction_date && (
                  <p className="mt-2 text-sm text-red-600">{errors.transaction_date.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/transactions')}
                  className="btn btn-secondary btn-lg flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateTransactionMutation.isPending}
                  className="btn btn-primary btn-lg flex-1"
                >
                  {updateTransactionMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Update Transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Transaction Information Card */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <div className="font-medium text-gray-900">
                  {new Date(transaction.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <div className="font-medium text-gray-900">
                  {new Date(transaction.updated_at).toLocaleString()}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Transaction ID:</span>
                <div className="font-mono text-xs text-gray-900 break-all">
                  {transaction.id}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTransaction;
