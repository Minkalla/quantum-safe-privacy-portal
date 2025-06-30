import React, { useState } from 'react';
import { ConsentType } from '../../types/consent';
import { useConsent } from '../../contexts/ConsentContext';
import { Check, X, Info } from 'lucide-react';
import ErrorMessage from '../ui/ErrorMessage';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ConsentOption {
  type: ConsentType;
  title: string;
  description: string;
  required: boolean;
}

const consentOptions: ConsentOption[] = [
  {
    type: ConsentType.DATA_PROCESSING,
    title: 'Data Processing',
    description: 'Allow processing of your personal data for core platform functionality.',
    required: true,
  },
  {
    type: ConsentType.ANALYTICS,
    title: 'Analytics & Performance',
    description: 'Help us improve the platform by sharing anonymous usage analytics.',
    required: false,
  },
  {
    type: ConsentType.MARKETING,
    title: 'Marketing Communications',
    description: 'Receive updates about new features and security improvements.',
    required: false,
  },
  {
    type: ConsentType.COOKIES,
    title: 'Cookies & Tracking',
    description: 'Allow cookies for enhanced user experience and preferences.',
    required: false,
  },
  {
    type: ConsentType.THIRD_PARTY_SHARING,
    title: 'Third-Party Sharing',
    description: 'Share anonymized data with security research partners.',
    required: false,
  },
];

const ConsentForm: React.FC = () => {
  const { consentState, updateConsent, isLoading, error, clearError } = useConsent();
  const [pendingUpdates, setPendingUpdates] = useState<Set<ConsentType>>(new Set());

  const handleConsentChange = async (consentType: ConsentType, granted: boolean) => {
    try {
      clearError();
      setPendingUpdates(prev => new Set(prev).add(consentType));
      
      await updateConsent(consentType, granted);
    } catch (err) {
      console.error('Failed to update consent:', err);
    } finally {
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(consentType);
        return newSet;
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Privacy & Consent Management
          </h2>
          <p className="text-gray-600">
            Manage your data processing preferences. You can update these settings at any time.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage error={error} />
          </div>
        )}

        <div className="space-y-6">
          {consentOptions.map((option) => {
            const isGranted = consentState[option.type];
            const isPending = pendingUpdates.has(option.type);
            
            return (
              <div
                key={option.type}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {option.title}
                      </h3>
                      {option.required && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">
                      {option.description}
                    </p>
                    
                    {option.required && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <Info className="h-4 w-4" />
                        <span>This consent is required for platform functionality</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    {isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleConsentChange(option.type, false)}
                          disabled={isLoading || (option.required && isGranted)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                            !isGranted
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } ${
                            option.required && isGranted
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
                          }`}
                        >
                          <X className="h-4 w-4" />
                          <span>Deny</span>
                        </button>
                        
                        <button
                          onClick={() => handleConsentChange(option.type, true)}
                          disabled={isLoading}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                            isGranted
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } cursor-pointer`}
                        >
                          <Check className="h-4 w-4" />
                          <span>Allow</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                About Your Privacy
              </h4>
              <p className="text-sm text-blue-700">
                Your consent choices are protected using post-quantum cryptography. 
                All data is encrypted and stored securely. You can modify these preferences 
                at any time from your account settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentForm;
