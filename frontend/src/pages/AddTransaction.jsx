import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionAPI } from '../utils/api';
import { ArrowLeft, Plus, Loader2, DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const AddTransaction = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    defaultValues: {
      type: 'EXPENSE',
      transaction_date: new Date().toISOString().split('T')[0],
    },
  });

  const transactionType = watch('type');

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: (transactionData) => transactionAPI.create(transactionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transaction added successfully!');
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error('Add transaction error:', error);
      const message = error.response?.data?.error || 'Failed to add transaction';
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    const transactionData = {
      ...data,
      amount: parseFloat(data.amount),
    };
    addTransactionMutation.mutate(transactionData);
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
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Add Transaction</h1>
            <p className="text-sm text-gray-500">
              Manually add a new income or expense transaction
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Form Card */}
          <div className="card-elevated p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
                <p className="text-sm text-gray-500">Fill in the information below</p>
              </div>
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
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-secondary btn-lg flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTransactionMutation.isLoading}
                  className="btn btn-primary btn-lg flex-1"
                >
                  {addTransactionMutation.isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Add Transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Add Suggestions */}
          <div className="mt-6 card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Coffee', amount: 5, category: 'Food & Dining', type: 'EXPENSE' },
                { label: 'Lunch', amount: 15, category: 'Food & Dining', type: 'EXPENSE' },
                { label: 'Gas', amount: 50, category: 'Transportation', type: 'EXPENSE' },
                { label: 'Groceries', amount: 100, category: 'Groceries', type: 'EXPENSE' },
                { label: 'Salary', amount: 3000, category: 'Salary', type: 'INCOME' },
                { label: 'Freelance', amount: 500, category: 'Freelance', type: 'INCOME' },
              ].map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => {
                    setValue('type', suggestion.type);
                    setValue('amount', suggestion.amount);
                    setValue('description', suggestion.label);
                    setValue('category', suggestion.category);
                  }}
                  className="p-3 text-left border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{suggestion.label}</div>
                  <div className="text-sm text-gray-500">₹{suggestion.amount}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTransaction;
