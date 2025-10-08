
import React from 'react';
import type { PromptAnalysis } from '../types';
import ShieldIcon from './icons/ShieldIcon';

const getScoreColor = (score: number) => {
  if (score < 0.3) return 'text-green-400';
  if (score < 0.7) return 'text-yellow-400';
  return 'text-red-400';
};

const getCategoryStyle = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'prompt injection':
    case 'escalation':
      return 'bg-rose-500/30 text-rose-300 border border-rose-500/50';
    case 'illegal activities':
      return 'bg-teal-500/30 text-teal-300 border border-teal-500/50';
    case 'automated attack / obfuscation':
      return 'bg-sky-500/30 text-sky-300 border border-sky-500/50';
    case 'adversarial suffix':
    case 'hate speech':
      return 'bg-red-500/30 text-red-300 border border-red-500/50';
    case 'phishing':
    case 'malware generation':
      return 'bg-orange-500/30 text-orange-300 border border-orange-500/50';
    default:
      return 'bg-gray-600/30 text-gray-300 border border-gray-600/50';
  }
};

const AttackCategoryTag: React.FC<{ category: string }> = ({ category }) => (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryStyle(category)}`}>
        {category}
    </span>
);


const PromptHistory: React.FC<{ prompts: PromptAnalysis[] }> = ({ prompts }) => {
  if (prompts.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-300">Prompt History</h3>
        <p className="text-gray-500 mt-1">No prompts submitted yet. Start a session to see the history here.</p>
      </div>
    );
  }
  
  const hasAutomatedAttack = (p: PromptAnalysis) => p.attackCategories.some(c => c.toLowerCase().includes('automated attack'));

  return (
    <div className="space-y-4">
       <h3 className="text-xl font-semibold text-gray-300 border-b border-gray-700 pb-2">Prompt History</h3>
      {prompts.map((p) => (
        <div key={p.id} className="relative p-4 rounded-lg bg-gray-800/80 border border-gray-700/80 shadow-md overflow-hidden">
            <div className="absolute top-4 right-4 text-right">
                <p className="text-sm text-gray-400">Risk Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(p.score)}`}>
                    {p.score.toFixed(2)}
                </p>
            </div>
          
            <div className="pr-24 space-y-4">
                <p className="text-gray-300 font-mono whitespace-pre-wrap"><span className="font-bold text-indigo-400">P{p.id}:</span> {p.text}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
                {p.moderationReason && p.moderationReason !== 'NONE' && (
                    <span className="text-sm font-bold px-3 py-1.5 rounded-md bg-orange-600 text-white flex items-center w-fit">
                        <ShieldIcon />
                        BLOCKED: {p.moderationReason}
                    </span>
                )}
                {p.isJailbreak && (
                    <span className="text-sm font-bold px-3 py-1.5 rounded-md bg-red-600 text-white uppercase">
                        Jailbreak Attempt
                    </span>
                )}
                {hasAutomatedAttack(p) && (
                    <span className="text-sm font-bold px-3 py-1.5 rounded-md bg-purple-600 text-white uppercase">
                        Automated Attack Detected
                    </span>
                )}
            </div>
          
            {p.attackCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-700/50">
                    {p.attackCategories.map(cat => <AttackCategoryTag key={cat} category={cat} />)}
                </div>
            )}

            <div className="mt-4">
                <p className="text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md border border-gray-700/70">
                    <span className="font-semibold text-gray-300">Justification:</span> {p.justification}
                </p>
            </div>
        </div>
      ))}
    </div>
  );
};

export default PromptHistory;
