import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nlpAPI, transactionAPI } from '../utils/api';
import { ArrowLeft, Zap, Loader2, MessageCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SmartAdd = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [parsedTransaction, setParsedTransaction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef(false);

  // Parse transaction mutation
  const parseTransactionMutation = useMutation({
    mutationFn: (text) => nlpAPI.parse(text),
    onSuccess: (data) => {
      // Add today's date if not provided by NLP
      const enhancedData = {
        ...data,
        transaction_date: data.transaction_date || new Date().toISOString().split('T')[0]
      };
      setParsedTransaction(enhancedData);
      // Automatically add the transaction after parsing
      if (!isSubmitting) {
        handleAutoAdd(enhancedData);
      }
    },
    onError: (error) => {
      console.error('Parse transaction error:', error);
      const message = error.response?.data?.error || 'Failed to parse transaction';
      toast.error(message);
      setIsSubmitting(false);
    },
  });

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: (transactionData) => transactionAPI.create(transactionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transaction saved successfully to database!');
      setIsSubmitting(false);
      submitRef.current = false;
      // Don't navigate, just show acknowledgement
    },
    onError: (error) => {
      console.error('Add transaction error:', error);
      const message = error.response?.data?.error || 'Failed to add transaction';
      toast.error(message);
      setIsSubmitting(false);
      submitRef.current = false;
    },
  });

  const handleAutoAdd = (data) => {
    // Double-check with both state and ref to prevent duplicate submissions
    if (!data || isSubmitting || addTransactionMutation.isPending || submitRef.current) return;
    
    console.log('SmartAdd - handleAutoAdd called with data:', data);
    setIsSubmitting(true);
    submitRef.current = true;
    
    // Use the description from NLP API, fallback to input processing if needed
    let description = data.description || data.memo;
    
    // Only process input text if NLP didn't provide a good description
    if (!description || description.length < 3) {
      // Try to extract description from the input
      const inputText = input.trim();
      // Remove amount-related words and extract description
      const amountRegex = /(\d+(?:\.\d+)?)\s*(?:rs|rupees?|₹)?/gi;
      const withoutAmount = inputText.replace(amountRegex, '').trim();
      // Remove common words like 'for', 'paid', 'spent', etc.
      description = withoutAmount
        .replace(/^(paid|spent|received|got|for|at|on|in)\s+/gi, '')
        .replace(/\s+(for|at|on|in)\s+/gi, ' ')
        .trim() || 'Transaction';
    }
    
    // Fix date format - backend expects YYYY-MM-DD, not ISO format
    let transactionDate = data.transaction_date;
    if (transactionDate && transactionDate.includes('T')) {
      // Convert from ISO format to YYYY-MM-DD
      transactionDate = transactionDate.split('T')[0];
    } else if (!transactionDate) {
      // If no date provided by NLP, default to today
      transactionDate = new Date().toISOString().split('T')[0];
    }
    
    const cleanData = {
      ...data,
      amount: parseFloat(data.amount),
      description: description,
      transaction_date: transactionDate,
    };
    
    console.log('SmartAdd - Auto-submitting transaction:', cleanData);
    addTransactionMutation.mutate(cleanData);
  };

  const handleParse = (e) => {
    e.preventDefault();
    if (!input.trim()) {
      toast.error('Please enter a transaction description');
      return;
    }
    parseTransactionMutation.mutate(input.trim());
  };

  const resetForm = () => {
    setInput('');
    setParsedTransaction(null);
    setIsSubmitting(false);
    submitRef.current = false;
  };

  const examples = [
    "Paid ₹500 for groceries at Big Bazaar yesterday",
    "Received salary of ₹50000 on 1st March",
    "Spent 300 rupees on lunch today",
    "Got ₹1000 cashback from credit card",
    "Electricity bill payment of ₹2500",
    "Freelance income of ₹15000 received",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Add</h1>
          <p className="text-sm text-gray-500">
            Use natural language to add transactions quickly
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Input Card */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center space-x-2">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Describe Your Transaction
                </h2>
              </div>
            </div>

            <div className="card-content">
              <form onSubmit={handleParse} className="space-y-4">
                <div>
                  <label htmlFor="transaction-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Description
                  </label>
                  <textarea
                    id="transaction-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g., Paid ₹500 for groceries at Big Bazaar yesterday"
                    className="input min-h-[100px] resize-none"
                    disabled={parseTransactionMutation.isPending}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={parseTransactionMutation.isPending || !input.trim()}
                    className="btn btn-primary flex-1"
                  >
                    {parseTransactionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Parse Transaction
                      </>
                    )}
                  </button>
                  
                  {parsedTransaction && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-secondary"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Examples Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Example Inputs</h3>
            </div>
            <div className="card-content">
              <p className="text-sm text-gray-600 mb-4">
                Try these examples to see how Smart Add works:
              </p>
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(example)}
                    className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={parseTransactionMutation.isPending}
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {parsedTransaction && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-success-100 p-2 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-success-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {addTransactionMutation.isSuccess ? 'Transaction Saved' : 'Transaction Details'}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="card-content">
                <div className="space-y-3">
                  {/* View Mode */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Type:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      parsedTransaction.type === 'INCOME'
                        ? 'bg-success-100 text-success-800'
                        : 'bg-danger-100 text-danger-800'
                    }`}>
                      {parsedTransaction.type}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">
                      ₹{parseFloat(parsedTransaction.amount || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Description:</span>
                    <span className="text-gray-900 font-medium">
                      {parsedTransaction.description}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Category:</span>
                    <span className="text-gray-900">
                      {parsedTransaction.category || 'Other'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Date:</span>
                    <span className="text-gray-900">
                      {parsedTransaction.transaction_date 
                        ? new Date(parsedTransaction.transaction_date).toLocaleDateString()
                        : new Date().toLocaleDateString()
                      }
                    </span>
                  </div>
                </div>

                {/* Transaction Status */}
                <div className="pt-4 border-t mt-4">
                  {addTransactionMutation.isPending ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <span className="text-blue-800 font-medium">Saving transaction to database...</span>
                      </div>
                    </div>
                  ) : addTransactionMutation.isSuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-800 font-medium">Transaction saved successfully!</span>
                        </div>
                        <button
                          onClick={resetForm}
                          className="btn btn-secondary btn-sm"
                        >
                          Add Another
                        </button>
                      </div>
                      <p className="text-green-700 text-sm mt-2">
                        Your transaction has been saved to the database and will appear in your transactions list.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Tips Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Tips for Better Results</h3>
            </div>
            <div className="card-content">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">•</span>
                  Include the amount with currency symbol (₹) or words like "rupees"
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">•</span>
                  Mention if it's income (salary, received, earned) or expense (paid, spent, bought)
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">•</span>
                  Add context like location, merchant, or category
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">•</span>
                  Include time references (today, yesterday, specific dates)
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">•</span>
                  Be as descriptive as possible for better parsing accuracy
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartAdd;
