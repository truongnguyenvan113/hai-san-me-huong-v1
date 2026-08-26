// Ensure window.fetch is writable if a polyfill or library attempts to assign to it
try {
  const originalFetch = window.fetch;
  let customFetch = originalFetch;
  Object.defineProperty(window, 'fetch', {
    get() {
      return customFetch;
    },
    set(v) {
      customFetch = v;
    },
    configurable: true,
    enumerable: true,
  });
} catch (e) {
  // Ignore in restricted environments
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
