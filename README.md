# Jailbreak Prevention System

An advanced AI-powered system for real-time detection and analysis of multi-turn jailbreak attempts. This tool provides live session monitoring, multi-user threat intelligence, model validation, and custom model training capabilities to help identify and mitigate adversarial attacks on large language models.

## Key Features

- **Live Session Analysis**: Analyzes prompts in real-time within a session to detect escalating threats and sequential jailbreak attempts.
- **Multi-Layered Detection**: Utilizes both Gemini for sophisticated individual prompt analysis and a local logistic regression model for session-level risk assessment.
- **Multi-User Threat Intelligence**: Simulates and monitors activity from different user subnets to identify suspicious patterns and potential coordinated attacks.
- **Semantic Threat Graph**: Visualizes semantic relationships between prompts across different users and sessions to uncover hidden attack vectors.
- **Model Validation**: Includes a comprehensive dashboard to test the performance of the local risk model against various datasets, complete with metrics like ROC/AUC, precision-recall curves, and confusion matrices.
- **Custom Model Training**: Allows users to train the local logistic regression model on their own datasets to tailor its performance to specific threat models.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI/ML**: Google Gemini API (`gemini-2.5-flash`), Custom Logistic Regression Model
- **Charting**: Recharts
- **Build Tool**: Vite

## Getting Started

Follow these steps to install and use the component library in your project.

### Prerequisites

- Node.js and npm installed.
- A React project (`create-react-app`, `vite`, etc.).
- A Google Gemini API key. You can get one from [Google AI Studio](https://ai.studio.google.com/app/apikey).

### Installation

Install the package from npm:
```bash
npm install @pravinraj2006/jailbreak-prevention-system
```

### Usage & API Key Configuration

This library requires a Google Gemini API key to function. The key must be provided at runtime to the `JPSProvider` component, which should wrap your application's root. This approach ensures that your API key is handled securely and is not bundled in your client-side code.

**1. Import the Provider and Components:**
Import the `JPSProvider` and the components you need from the library.

**2. Wrap Your App and Provide the Key:**
In your main application entry point (e.g., `index.tsx` or `App.tsx`), wrap your component tree with `JPSProvider` and pass your Gemini API key as the `apiKey` prop.

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { JPSProvider, JailbreakPreventionSystem } from '@pravinraj2006/jailbreak-prevention-system';

// It is highly recommended to load your API key from a secure
// environment variable, rather than hardcoding it.
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

const App = () => (
  <JPSProvider apiKey={GEMINI_API_KEY}>
    {/* The JailbreakPreventionSystem or your custom components go here */}
    <JailbreakPreventionSystem />
  </JPSProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

### Using Individual Components
You can also import and use individual components or services from the library to build a custom implementation. Just ensure they are rendered inside a `JPSProvider`.

```jsx
import { JPSProvider, PromptInput, SessionAnalysis } from '@pravinraj2006/jailbreak-prevention-system';

function MyCustomSecurityUI() {
  // Your custom logic here...
  return (
    <div>
      <PromptInput onNewPrompt={...} />
      <SessionAnalysis analysis={...} />
    </div>
  );
}
    
// Remember to wrap with the provider
const App = () => (
   <JPSProvider apiKey={GEMINI_API_KEY}>
    <MyCustomSecurityUI />
  </JPSProvider>
)
```

## Local Development

To run this project locally for development:

1. Clone the repo and run `npm install`.
2. Create a `.env` file in the root and add `API_KEY="YOUR_API_KEY_HERE"`.
3. Run `npm run dev`.

## Disclaimer

This is a proof-of-concept tool designed for educational and research purposes. The analysis provided should not be considered a substitute for a comprehensive security review. The models may produce inaccurate or inconsistent results.