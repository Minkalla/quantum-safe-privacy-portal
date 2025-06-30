import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConsentType, ConsentRecord, ConsentState, ConsentError } from '../types/consent';
import { consentService } from '../services/consentService';
import { useAuth } from './AuthContext';

interface ConsentContextType {
  consents: ConsentRecord[];
  consentState: ConsentState;
  isLoading: boolean;
  error: ConsentError | null;
  updateConsent: (consentType: ConsentType, granted: boolean) => Promise<void>;
  refreshConsents: () => Promise<void>;
  clearError: () => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
};

interface ConsentProviderProps {
  children: ReactNode;
}

const initialConsentState: ConsentState = {
  [ConsentType.MARKETING]: false,
  [ConsentType.ANALYTICS]: false,
  [ConsentType.DATA_PROCESSING]: false,
  [ConsentType.COOKIES]: false,
  [ConsentType.THIRD_PARTY_SHARING]: false,
};

export const ConsentProvider: React.FC<ConsentProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [consentState, setConsentState] = useState<ConsentState>(initialConsentState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ConsentError | null>(null);

  const clearError = () => setError(null);

  const updateConsentState = (consentRecords: ConsentRecord[]) => {
    const newState = { ...initialConsentState };
    
    consentRecords.forEach(consent => {
      newState[consent.consentType] = consent.granted;
    });
    
    setConsentState(newState);
  };

  const refreshConsents = async () => {
    if (!user?.id || !isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const userConsents = await consentService.getConsentByUserId(user.id);
      setConsents(userConsents);
      updateConsentState(userConsents);
    } catch (err) {
      setError(err as ConsentError);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConsent = async (consentType: ConsentType, granted: boolean) => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const consentData = {
        userId: user.id,
        consentType,
        granted,
        ipAddress: undefined,
        userAgent: navigator.userAgent,
      };

      const updatedConsent = await consentService.createConsent(consentData);
      
      setConsents(prev => {
        const filtered = prev.filter(c => c.consentType !== consentType);
        return [...filtered, updatedConsent];
      });

      setConsentState(prev => ({
        ...prev,
        [consentType]: granted,
      }));
    } catch (err) {
      setError(err as ConsentError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      refreshConsents();
    } else {
      setConsents([]);
      setConsentState(initialConsentState);
    }
  }, [isAuthenticated, user?.id]);

  const value: ConsentContextType = {
    consents,
    consentState,
    isLoading,
    error,
    updateConsent,
    refreshConsents,
    clearError,
  };

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};
