import '@testing-library/jest-dom';
import { vi } from 'vitest';
import i18n from '@/i18n';

// Tests assert on English copy. Pin the language so a Sinhala default (or a
// stray localStorage value) can never change what components render here.
await i18n.changeLanguage('en');

// Mock window.matchMedia for MUI / Responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
