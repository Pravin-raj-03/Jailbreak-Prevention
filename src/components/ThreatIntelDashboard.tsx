
import React, { useState } from 'react';
import type { AllSubnetsState, SubnetAnalysisResult, PromptAnalysis } from '../types';
import { analyzeGroupRisk } from '../services/geminiService';
import SpinnerIcon from './icons/SpinnerIcon';
import RadarIcon from './icons/RadarIcon';
import GraphIcon from './icons/GraphIcon';
import ThreatGraph from './ThreatGraph';

const getScoreColor = (score: number) => {
  if (score < 0.3) return 'text-green-400';
  if (score < 0.7) return 'text-yellow-400';
  return 'text-red-400';
};

const getClassificationClasses = (classification: SubnetAnalysisResult['classification'] | null) => {
  switch (classification) {
    case 'Coordinated Threat':
      return { text: 'text-red-300', border: 'border-red-700', bg: 'bg-red-900/50' };
    case 'Suspicious Activity':
      return { text: 'text-yellow-300', border: 'border-yellow-700', bg: 'bg-yellow-900/50' };
    case 'Safe':
      return { text: 'text-green-300', border: 'border-green-700', bg: 'bg-green-900/50' };
    default:
      return { text: 'text-gray-300', border: 'border-gray-600', bg: 'bg-gray-700/50' };
  }
};


const SubnetCard: React.FC<{ subnet: string; prompts: PromptAnalysis[] }> = ({ subnet, prompts }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<SubnetAnalysisResult | null>(null);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        try {
            const result = await analyzeGroupRisk(prompts);
            setAnalysis(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const classes = getClassificationClasses(analysis?.classification ?? null);

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold font-mono text-indigo-400">{subnet}</h3>
                <span className="text-sm bg-gray-700 px-2 py-1 rounded-full">{prompts.length} Prompts</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-900/50 p-3 rounded-md border border-gray-600">
                {prompts.map((p, index) => (
                    <p key={index} className="text-sm text-gray-400 font-mono truncate">
                       <span className={`font-bold ${getScoreColor(p.score)}`}>({p.score.toFixed(2)})</span>: {p.text}
                    </p>
                ))}
            </div>

            <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-gray-500 flex items-center justify-center space-x-2"
            >
                {isLoading ? <SpinnerIcon /> : <RadarIcon />}
                <span>{isLoading ? 'Analyzing...' : 'Analyze Subnet'}</span>
            </button>

            {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

            {analysis && (
                <div className={`p-4 rounded-lg border ${classes.border} ${classes.bg} mt-4 space-y-2`}>
                     <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-400">Group Classification</p>
                            <p className={`text-xl font-bold ${classes.text}`}>{analysis.classification}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 text-right">Group Risk Score</p>
                            <p className={`text-2xl font-bold text-right ${classes.text}`}>{analysis.groupRiskScore.toFixed(2)}</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400"><span className="font-semibold">Justification:</span> {analysis.justification}</p>
                </div>
            )}
        </div>
    );
};


const ThreatIntelDashboard: React.FC<{ allSubnets: AllSubnetsState }> = ({ allSubnets }) => {
    const [showGraph, setShowGraph] = useState(false);
    const subnets = Object.keys(allSubnets);

    if (subnets.length === 0) {
        return (
            <div className="text-center py-20 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-semibold text-gray-300">Multi-User Threat Intelligence</h2>
                <p className="text-gray-500 mt-2">No activity detected. Start a 'Live Session' with a specified subnet to begin monitoring.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
             <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                    Subnet Activity Overview
                </h2>
                {subnets.length > 0 && (
                     <button
                        onClick={() => setShowGraph(true)}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center justify-center space-x-2"
                    >
                        <GraphIcon />
                        <span>Visualize Threat Graph</span>
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {subnets.map(subnet => (
                    <SubnetCard key={subnet} subnet={subnet} prompts={allSubnets[subnet]} />
                ))}
            </div>
            {showGraph && (
                <ThreatGraph allSubnets={allSubnets} onClose={() => setShowGraph(false)} />
            )}
        </div>
    );
};

export default ThreatIntelDashboard;
