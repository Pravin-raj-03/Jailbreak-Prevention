
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SessionAnalysisResult, PromptAnalysis } from '../types';

interface SessionAnalysisProps {
  analysis: SessionAnalysisResult | null;
  prompts: PromptAnalysis[];
  isCustomModel: boolean;
}

const getClassificationClasses = (classification: SessionAnalysisResult['classification'] | null) => {
  switch (classification) {
    case 'Harmful':
      return {
        bg: 'bg-red-900/50',
        text: 'text-red-300',
        border: 'border-red-700',
        label: 'Harmful'
      };
    case 'Potentially Harmful':
      return {
        bg: 'bg-yellow-900/50',
        text: 'text-yellow-300',
        border: 'border-yellow-700',
        label: 'Potentially Harmful'
      };
    case 'Safe':
      return {
        bg: 'bg-green-900/50',
        text: 'text-green-300',
        border: 'border-green-700',
        label: 'Safe'
      };
    default:
      return {
        bg: 'bg-gray-700/50',
        text: 'text-gray-300',
        border: 'border-gray-600',
        label: 'Awaiting Analysis'
      };
  }
};


const SessionAnalysis: React.FC<SessionAnalysisProps> = ({ analysis, prompts, isCustomModel }) => {
  const chartData = prompts.map(p => ({ name: `P${p.id}`, 'Individual Risk': p.score }));
  if (analysis) {
    chartData.forEach((d, i) => {
        if(i === chartData.length-1) {
            d['Session Risk'] = analysis.sessionRiskScore;
        } else {
            d['Session Risk'] = null;
        }
    })
  }
  
  const classes = getClassificationClasses(analysis?.classification ?? null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
          Session Analysis
        </h2>
        {isCustomModel && (
            <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500 px-2 py-1 rounded-full">
                CUSTOM MODEL ACTIVE
            </span>
        )}
      </div>
      <p className="text-xs text-gray-500 -mt-4 mb-4">
        Live analysis uses a local machine learning model (Logistic Regression) to calculate session risk in real-time based on prompt score history.
      </p>
      
      {!analysis && (
         <div className="flex-grow flex items-center justify-center">
            <div className="text-center text-gray-500">
                <p>Submit a prompt to begin session analysis.</p>
            </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg border ${classes.border} ${classes.bg}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400">Overall Classification</p>
                <p className={`text-2xl font-bold ${classes.text}`}>{classes.label}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Aggregated Score</p>
                <p className={`text-3xl font-bold text-right ${classes.text}`}>
                  {analysis.sessionRiskScore.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Risk Progression</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis dataKey="name" stroke="#A0AEC0" />
                        <YAxis stroke="#A0AEC0" domain={[0, 1]}/>
                        <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                        <Legend wrapperStyle={{ color: '#A0AEC0' }}/>
                        <Line type="monotone" dataKey="Individual Risk" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                         <Line type="monotone" dataKey="Session Risk" stroke="#f87171" strokeWidth={2} activeDot={{ r: 8 }} connectNulls={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionAnalysis;
