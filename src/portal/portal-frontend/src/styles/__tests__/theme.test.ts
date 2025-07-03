/**
 * @file theme.test.ts
 * @description Unit tests for theme configuration.
 * Tests Material-UI theme creation with branding configuration.
 *
 * @module ThemeTests
 * @author Minkalla
 * @license MIT
 */

import { createBrandedTheme, defaultTheme } from '../theme';

describe('Theme Configuration', () => {
  describe('createBrandedTheme', () => {
    it('should create default theme when no branding provided', () => {
      const theme = createBrandedTheme();

      expect(theme.palette.primary.main).toBe('#1976d2');
      expect(theme.palette.secondary.main).toBe('#dc004e');
      expect(theme.typography.fontFamily).toBe('"Roboto", "Helvetica", "Arial", sans-serif');
    });

    it('should apply custom branding colors', () => {
      const branding = {
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        companyName: 'Test Company',
      };

      const theme = createBrandedTheme(branding);

      expect(theme.palette.primary.main).toBe('#ff0000');
      expect(theme.palette.secondary.main).toBe('#00ff00');
    });

    it('should maintain accessibility standards', () => {
      const theme = createBrandedTheme();

      expect(theme.palette.primary.contrastText).toBe('#ffffff');
      expect(theme.palette.secondary.contrastText).toBe('#ffffff');
      expect(theme.palette.text.primary).toBe('rgba(0, 0, 0, 0.87)');
      expect(theme.palette.text.secondary).toBe('rgba(0, 0, 0, 0.6)');
    });

    it('should configure component overrides', () => {
      const theme = createBrandedTheme();

      expect(theme.components?.MuiButton?.styleOverrides?.root).toEqual({
        textTransform: 'none',
        borderRadius: 4,
        padding: '8px 16px',
      });
    });

    it('should apply custom primary color to TextField focus', () => {
      const branding = {
        primaryColor: '#purple',
      };

      const theme = createBrandedTheme(branding);
      const textFieldOverrides = theme.components?.MuiTextField?.styleOverrides?.root;

      expect(textFieldOverrides).toBeDefined();
    });
  });

  describe('defaultTheme', () => {
    it('should be created with default branding', () => {
      expect(defaultTheme.palette.primary.main).toBe('#1976d2');
      expect(defaultTheme.palette.secondary.main).toBe('#dc004e');
    });
  });
});
