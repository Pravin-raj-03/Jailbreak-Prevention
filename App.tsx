import React, { useState, useCallback } from 'react';
import { analyzePromptRisk, moderatePrompt } from './services/geminiService';
import { predictSessionRiskWithLocalModel, DEFAULT_MODEL_WEIGHTS } from './services/riskModelService';
import type { PromptAnalysis, SessionAnalysisResult, AllSubnetsState, ModelWeights } from './types';
import PromptInput from './components/PromptInput';
import PromptHistory from './components/PromptHistory';
import SessionAnalysis from './components/SessionAnalysis';
import ValidationDashboard from './components/ValidationDashboard';
import ThreatIntelDashboard from './components/ThreatIntelDashboard';
import ModelTrainingDashboard from './components/ModelTrainingDashboard';
import BrainIcon from './components/icons/BrainIcon';

type View = 'live' | 'validation' | 'training' | 'threat-intel';

// Add a list of predefined subnets for easier testing
const PREDEFINED_SUBNETS = ['Corporate-VPN-1', 'Public-WiFi-NYC', 'University-Network', 'Home-Network-A', 'Custom...'];


function App() {
  // State for the current, single user session
  const [prompts, setPrompts] = useState<PromptAnalysis[]>([]);
  const [sessionAnalysis, setSessionAnalysis] = useState<SessionAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Global state for multi-user threat intelligence
  const [allSubnets, setAllSubnets] = useState<AllSubnetsState>({});

  // State for subnet selection
  const [selectedSubnet, setSelectedSubnet] = useState<string>(PREDEFINED_SUBNETS[0]);
  const [customSubnet, setCustomSubnet] = useState<string>('192.168.1.0/24');

  // The effective subnet used for submissions
  const currentSubnet = selectedSubnet === 'Custom...' ? customSubnet : selectedSubnet;

  // Model weights state
  const [modelWeights, setModelWeights] = useState<ModelWeights>(DEFAULT_MODEL_WEIGHTS);

  // App view state
  const [view, setView] = useState<View>('live');

  const handleNewPrompt = useCallback(async (promptText: string) => {
    setIsLoading(true);
    setError(null);
    
    if (!currentSubnet.trim()) {
        setError("User Subnet cannot be empty.");
        setIsLoading(false);
        return;
    }

    try {
      const isSingleWordInitialPrompt = prompts.length === 0 && promptText.trim().split(/\s+/).length === 1;
      let newPromptAnalysis: PromptAnalysis;

      if (isSingleWordInitialPrompt) {
        // Deterministic Bypass: If it's the first prompt and only a single word,
        // skip the strict moderation and go directly to the nuanced, context-aware risk analysis.
        const individualAnalysis = await analyzePromptRisk(promptText, prompts);
        newPromptAnalysis = {
          id: prompts.length + 1,
          text: promptText,
          subnet: currentSubnet,
          ...individualAnalysis,
        };
      } else {
        // Step 1: Pre-analysis moderation with conversation history
        const moderationResult = await moderatePrompt(promptText, prompts);

        if (moderationResult.blocked && moderationResult.reason !== 'NONE') {
          // Prompt is blocked, create a high-risk analysis object directly
          newPromptAnalysis = {
            id: prompts.length + 1,
            text: promptText,
            subnet: currentSubnet,
            score: 1.0,
            isJailbreak: true, // Treat policy violations as a form of jailbreak
            attackCategories: [moderationResult.reason],
            justification: 'Prompt blocked by pre-analysis safety moderator due to policy violation.',
            moderationReason: moderationResult.reason,
          };
        } else {
          // Step 2: Proceed with detailed, context-aware risk analysis if not blocked
          const individualAnalysis = await analyzePromptRisk(promptText, prompts);
          newPromptAnalysis = {
            id: prompts.length + 1,
            text: promptText,
            subnet: currentSubnet,
            ...individualAnalysis,
          };
        }
      }

      const updatedPrompts = [...prompts, newPromptAnalysis];
      setPrompts(updatedPrompts);

      // Update the global state for the threat intel dashboard
      setAllSubnets(prev => ({
          ...prev,
          [currentSubnet]: [...(prev[currentSubnet] || []), newPromptAnalysis]
      }));

      // Use the local ML model (with current weights) for session analysis.
      if (updatedPrompts.length > 0) {
        const newSessionResult = predictSessionRiskWithLocalModel(updatedPrompts, modelWeights);
        const previousScore = sessionAnalysis?.sessionRiskScore ?? 0;

        // The session risk score is now 'sticky' and will only increase.
        if (newSessionResult.sessionRiskScore >= previousScore) {
          setSessionAnalysis(newSessionResult);
        } else {
          // If the new score is lower, we create a new result object but keep the old, higher score
          setSessionAnalysis({
            ...newSessionResult,
            sessionRiskScore: previousScore,
          });
        }
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [prompts, currentSubnet, modelWeights, sessionAnalysis]);

  const handleReset = () => {
    setPrompts([]);
    setSessionAnalysis(null);
    setError(null);
    setIsLoading(false);
  };
  
  const getTabClasses = (tabName: View) => {
      const inactive = "py-2 px-4 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-t-lg transition-colors flex items-center space-x-2";
      const active = "py-2 px-4 text-white bg-gray-800/50 rounded-t-lg border-b-2 border-indigo-500 font-semibold flex items-center space-x-2";
      return view === tabName ? active : inactive;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            Jailbreak Prevention System
          </h1>
          <p className="mt-2 text-gray-400 max-w-2xl mx-auto">
            An advanced system to detect and analyze sequential jailbreak attempts in multi-turn conversations.
          </p>
        </header>

        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
             <button onClick={() => setView('live')} className={getTabClasses('live')}>
              <span>Live Session Analysis</span>
            </button>
            <button onClick={() => setView('validation')} className={getTabClasses('validation')}>
              <span>Model Validation</span>
            </button>
            <button onClick={() => setView('training')} className={getTabClasses('training')}>
                <BrainIcon />
                <span>Model Training</span>
            </button>
             <button onClick={() => setView('threat-intel')} className={getTabClasses('threat-intel')}>
              <span>Multi-User Threat Intel</span>
            </button>
          </nav>
        </div>

        {view === 'live' && (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col space-y-6">
               <div className="bg-gray-800/50 p-4 rounded-lg shadow-lg border border-gray-700">
                  <label htmlFor="subnet-select" className="block text-sm font-medium text-gray-400 mb-2">
                    User Subnet (for multi-user simulation)
                  </label>
                  <div className="flex space-x-2">
                    <select
                        id="subnet-select"
                        value={selectedSubnet}
                        onChange={(e) => setSelectedSubnet(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading || prompts.length > 0}
                    >
                        {PREDEFINED_SUBNETS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {selectedSubnet === 'Custom...' && (
                        <input
                            type="text"
                            value={customSubnet}
                            onChange={(e) => setCustomSubnet(e.target.value)}
                            placeholder="e.g., 10.0.0.0/16"
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading || prompts.length > 0}
                        />
                    )}
                  </div>
                  {prompts.length > 0 && <p className="text-xs text-gray-500 mt-2">Reset session to change subnet.</p>}
                </div>
              <PromptInput onNewPrompt={handleNewPrompt} isLoading={isLoading} />
              {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md">{error}</div>}
               <button
                  onClick={handleReset}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-gray-500"
                  disabled={isLoading || prompts.length === 0}
                >
                  Reset Session
                </button>
              <PromptHistory prompts={prompts} />
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg shadow-2xl border border-gray-700">
              <SessionAnalysis 
                analysis={sessionAnalysis} 
                prompts={prompts} 
                isCustomModel={modelWeights !== DEFAULT_MODEL_WEIGHTS}
              />
            </div>
          </main>
        )}
        
        {view === 'training' && (
            <main>
                <ModelTrainingDashboard 
                    onApplyWeights={setModelWeights}
                    currentWeights={modelWeights}
                />
            </main>
        )}

        {view === 'validation' && (
          <main>
            <ValidationDashboard />
          </main>
        )}

        {view === 'threat-intel' && (
            <main>
                <ThreatIntelDashboard allSubnets={allSubnets} />
            </main>
        )}

      </div>
    </div>
  );
}

export default App;