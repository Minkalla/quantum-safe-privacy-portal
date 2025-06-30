import React, { useState } from 'react';
import { ConsentType } from '../../types/consent';
import { useConsent } from '../../contexts/ConsentContext';
import { X, Shield, Check } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consentType: ConsentType;
  title: string;
  description: string;
}

const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onClose,
  consentType,
  title,
  description,
}) => {
  const { updateConsent, isLoading, error, clearError } = useConsent();
  const [step, setStep] = useState(1);
  const [selectedChoice, setSelectedChoice] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleChoice = (granted: boolean) => {
    setSelectedChoice(granted);
    setStep(2);
  };

  const handleConfirm = async () => {
    if (selectedChoice === null) return;
    
    try {
      await updateConsent(consentType, selectedChoice);
      onClose();
      setStep(1);
      setSelectedChoice(null);
    } catch (err) {
      console.error('Failed to update consent:', err);
    }
  };

  const handleBack = () => {
    setStep(1);
    setSelectedChoice(null);
    clearError();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {step === 1 ? 'Consent Request' : 'Confirm Choice'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4">
              <ErrorMessage error={error} />
            </div>
          )}

          {step === 1 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-gray-600 mb-6">
                {description}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleChoice(true)}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
                >
                  <Check className="h-5 w-5" />
                  <span>Allow</span>
                </button>
                
                <button
                  onClick={() => handleChoice(false)}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                  <span>Deny</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirm Your Choice
              </h3>
              <p className="text-gray-600 mb-4">
                You have chosen to <strong>{selectedChoice ? 'allow' : 'deny'}</strong> {title.toLowerCase()}.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This choice will be recorded and can be changed later in your consent settings.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors duration-200"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
