/**
 * @file theme.ts
 * @description Material-UI theme configuration with dynamic branding support.
 * This module provides theme creation utilities for white-label branding,
 * enabling enterprise clients to customize the UI appearance while maintaining
 * WCAG 2.1 accessibility compliance.
 *
 * @module Theme
 * @author Minkalla
 * @license MIT
 */

import { createTheme, Theme } from '@mui/material/styles';

export interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  customCss?: string;
}

/**
 * Creates a Material-UI theme with branding configuration.
 * Ensures WCAG 2.1 accessibility compliance through proper contrast ratios.
 * @param branding Optional branding configuration to apply.
 * @returns Configured Material-UI theme.
 */
export const createBrandedTheme = (branding?: BrandingConfig): Theme => {
  return createTheme({
    palette: {
      primary: {
        main: branding?.primaryColor || '#1976d2',
        contrastText: '#ffffff',
      },
      secondary: {
        main: branding?.secondaryColor || '#dc004e',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: 'rgba(0, 0, 0, 0.87)',
        secondary: 'rgba(0, 0, 0, 0.6)',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.125rem',
        fontWeight: 300,
        lineHeight: 1.167,
      },
      h4: {
        fontSize: '2.125rem',
        fontWeight: 400,
        lineHeight: 1.235,
      },
      h6: {
        fontSize: '1.25rem',
        fontWeight: 500,
        lineHeight: 1.6,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.43,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 4,
            padding: '8px 16px',
          },
          contained: {
            boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
            '&:hover': {
              boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: branding?.primaryColor || '#1976d2',
              },
              '&.Mui-focused fieldset': {
                borderColor: branding?.primaryColor || '#1976d2',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });
};

export const defaultTheme = createBrandedTheme();
