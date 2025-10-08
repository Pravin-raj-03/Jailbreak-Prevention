import React, { useEffect } from 'react';
import { initializeGemini } from './services/geminiClient';

interface JPSProviderProps {
  apiKey: string;
  children: React.ReactNode;
}

export const JPSProvider: React.FC<JPSProviderProps> = ({ apiKey, children }) => {
  useEffect(() => {
    if (apiKey) {
      initializeGemini(apiKey);
    }
  }, [apiKey]);

  if (!apiKey) {
    return (
        <div style={{ padding: '20px', backgroundColor: '#333', color: 'red', border: '1px solid red', borderRadius: '8px' }}>
            <strong>Jailbreak Prevention System Error:</strong> An API key was not provided to the JPSProvider.
        </div>
    );
  }

  return <>{children}</>;
};

export default JPSProvider;
