/**
 * @file BrandingContext.test.tsx
 * @description Unit tests for BrandingContext.
 * Tests branding context functionality and theme provider integration.
 *
 * @module BrandingContextTests
 * @author Minkalla
 * @license MIT
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrandingProvider, useBranding } from '../BrandingContext';

global.fetch = jest.fn();

const TestComponent = () => {
  const { branding, isLoading } = useBranding();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <div data-testid="company-name">{branding?.companyName || 'Default'}</div>
      <div data-testid="primary-color">{branding?.primaryColor || '#1976d2'}</div>
    </div>
  );
};

describe('BrandingContext', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    localStorage.clear();
  });

  it('should provide default branding when no token exists', async () => {
    render(
      <BrandingProvider>
        <TestComponent />
      </BrandingProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('company-name')).toHaveTextContent('Default');
      expect(screen.getByTestId('primary-color')).toHaveTextContent('#1976d2');
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should fetch branding config when token exists', async () => {
    const mockBranding = {
      companyName: 'Test Company',
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      logoUrl: 'https://example.com/logo.png',
    };

    localStorage.setItem('accessToken', 'test-token');
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockBranding }),
    });

    render(
      <BrandingProvider>
        <TestComponent />
      </BrandingProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company');
      expect(screen.getByTestId('primary-color')).toHaveTextContent('#ff0000');
    });

    expect(fetch).toHaveBeenCalledWith('/portal/branding/config', {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });
  });

  it('should handle fetch errors gracefully', async () => {
    localStorage.setItem('accessToken', 'test-token');
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <BrandingProvider>
        <TestComponent />
      </BrandingProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('company-name')).toHaveTextContent('Default');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch branding config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should throw error when useBranding is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useBranding must be used within a BrandingProvider');

    consoleSpy.mockRestore();
  });
});
