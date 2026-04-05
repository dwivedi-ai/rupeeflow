import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'default', message = 'Loading...' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary-600`} />
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  );
};

export { LoadingSpinner };
export default LoadingSpinner;
