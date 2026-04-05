import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { transactionAPI } from '../utils/api';
import { downloadPDF } from '../utils/pdfGenerator';
import { Download, Calendar, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TransactionsPDFDownload = ({ className = '' }) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate = now;

    switch (dateRange) {
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'this-year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate + 'T23:59:59');
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate };
  };

  const formatDateRange = (start, end) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      
      const { startDate, endDate } = getDateRange();
      
      if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
        toast.error('Please select both start and end dates for custom range');
        return;
      }

      if (startDate > endDate) {
        toast.error('Start date cannot be after end date');
        return;
      }

      // Fetch transactions for the selected date range
      const response = await transactionAPI.getAll({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        limit: 1000, // Get all transactions
      });

      // Handle both possible response formats
      const transactions = response?.data || response || [];

      if (!Array.isArray(transactions) || transactions.length === 0) {
        toast.error('No transactions found for the selected date range');
        return;
      }

      const dateRangeText = formatDateRange(startDate, endDate);
      const filename = `RupeeFlow_Statement_${dateRange}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.pdf`;

      downloadPDF(transactions, dateRangeText, user, filename);
      toast.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('PDF download error:', error);
      const message = error.response?.data?.error || 'Failed to generate PDF';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Download Statement</h3>
          <p className="text-sm text-gray-500">Generate PDF statement for selected period</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Date Range Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Period
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="this-year">This Year</option>
            <option value="last-year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}

        {/* Preview Date Range */}
        {dateRange !== 'custom' && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {(() => {
                  const { startDate, endDate } = getDateRange();
                  return formatDateRange(startDate, endDate);
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="btn btn-primary w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download PDF Statement
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TransactionsPDFDownload;
