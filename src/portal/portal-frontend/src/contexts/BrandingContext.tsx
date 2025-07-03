/**
 * @file BrandingContext.tsx
 * @description React context for managing branding configuration state.
 * This context provides branding configuration to all components and manages
 * the Material-UI theme provider for white-label branding functionality.
 *
 * @module BrandingContext
 * @author Minkalla
 * @license MIT
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { BrandingConfig, createBrandedTheme } from '../styles/theme';

interface BrandingContextType {
  branding: BrandingConfig | null;
  updateBranding: (config: BrandingConfig) => void;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

interface BrandingProviderProps {
  children: ReactNode;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateBranding = (config: BrandingConfig) => {
    setBranding(config);
  };

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const response = await fetch('/portal/branding/config', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setBranding(data.data);
          } else if (response.status === 401) {
            console.warn('Unauthorized access to branding config - user may need to re-authenticate');
          } else {
            console.warn('Failed to fetch branding config:', response.statusText);
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranding();
  }, []);

  const theme = createBrandedTheme(branding || undefined);

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, isLoading }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </BrandingContext.Provider>
  );
};
