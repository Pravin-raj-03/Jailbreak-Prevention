import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import JPSProvider from './JPSProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// In a real application, this key would come from a secure source.
// FIX: Use process.env.API_KEY as per guidelines. This is made available by vite.config.ts.
const apiKey = process.env.API_KEY;

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <JPSProvider apiKey={apiKey}>
      <App />
    </JPSProvider>
  </React.StrictMode>
);