/**
 * Test Setup Configuration
 * Comprehensive testing environment for Nitrix platform
 */

import { configure } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Mock IndexedDB for testing
class MockIndexedDB {
  constructor() {
    this.databases = new Map();
  }

  open(name, version) {
    return new Promise((resolve) => {
      const db = {
        name,
        version,
        objectStoreNames: { contains: () => false },
        transaction: (stores, mode) => ({
          objectStore: (name) => ({
            add: jest.fn().mockResolvedValue({}),
            get: jest.fn().mockResolvedValue({}),
            getAll: jest.fn().mockResolvedValue([]),
            put: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
            index: () => ({
              getAll: jest.fn().mockResolvedValue([])
            })
          })
        }),
        createObjectStore: jest.fn().mockReturnValue({
          createIndex: jest.fn()
        })
      };
      
      setTimeout(() => resolve({ target: { result: db } }), 0);
    });
  }
}

// Global mocks
global.indexedDB = new MockIndexedDB();
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock File System Access API
global.showDirectoryPicker = jest.fn().mockResolvedValue({
  getFileHandle: jest.fn().mockResolvedValue({
    createWritable: jest.fn().mockResolvedValue({
      write: jest.fn(),
      close: jest.fn()
    })
  })
});

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  sequential: jest.fn().mockReturnValue({
    fit: jest.fn().mockResolvedValue({ history: {} }),
    predict: jest.fn().mockReturnValue({ dataSync: () => [0.5] }),
    compile: jest.fn()
  }),
  layers: {
    dense: jest.fn().mockReturnValue({}),
    dropout: jest.fn().mockReturnValue({})
  },
  tensor2d: jest.fn().mockReturnValue({}),
  metrics: {
    categoricalAccuracy: jest.fn().mockReturnValue({ dataSync: () => [0.8] })
  }
}));

// Console suppression for tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      // Only suppress React warnings about test environment
      if (args[0].includes('Warning: ReactDOM.render') ||
          args[0].includes('Warning: An invalid form control')) {
        return;
      }
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});