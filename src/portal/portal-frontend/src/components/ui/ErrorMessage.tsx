import React from 'react';
import { AlertCircle } from 'lucide-react';
import { AuthError, ConsentError } from '../../types/auth';

interface ErrorMessageProps {
  error: AuthError | ConsentError;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, className = '' }) => {
  const getMessage = () => {
    if (Array.isArray(error.message)) {
      return error.message.join(', ');
    }
    return error.message;
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-red-800">
            {error.error || 'Error'}
          </h3>
          <p className="text-sm text-red-700 mt-1">
            {getMessage()}
          </p>
          {error.statusCode && (
            <p className="text-xs text-red-600 mt-1">
              Status Code: {error.statusCode}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
