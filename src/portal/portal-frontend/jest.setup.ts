import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, {
  TextDecoder,
  TextEncoder,
});

import 'whatwg-fetch';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.BroadcastChannel = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

global.TransformStream = jest.fn().mockImplementation(() => ({
  readable: {
    getReader: jest.fn(() => ({
      read: jest.fn(() => Promise.resolve({ done: true, value: undefined })),
      releaseLock: jest.fn(),
    })),
  },
  writable: {
    getWriter: jest.fn(() => ({
      write: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
      releaseLock: jest.fn(),
    })),
  },
}));
