
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { trainModel, DEFAULT_MODEL_WEIGHTS } from '../services/riskModelService';
import { datasets } from '../data/datasets';
import type { TrainingReport, ModelWeights } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import ValidationCharts from './ValidationCharts';
import BrainIcon from './icons/BrainIcon';
import HistoryIcon from './icons/HistoryIcon';
import DownloadIcon from './icons/DownloadIcon';

interface ModelTrainingDashboardProps {
    onApplyWeights: (weights: ModelWeights) => void;
    currentWeights: ModelWeights;
}

const WeightsTable: React.FC<{ trained: ModelWeights, base: ModelWeights}> = ({ trained, base }) => {
    const keys = Object.keys(base) as (keyof ModelWeights)[];
    return (
        <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                    <tr>
                        <th className="px-4 py-2">Feature</th>
                        <th className="px-4 py-2 text-center">Default Weight</th>
                        <th className="px-4 py-2 text-center">Trained Weight</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map(key => {
                        const trainedWeight = trained[key];
                        const baseWeight = base[key];
                        const diff = trainedWeight - baseWeight;
                        let colorClass = 'text-gray-300';
                        if (diff > 0.01) colorClass = 'text-green-400';
                        if (diff < -0.01) colorClass = 'text-red-400';
                        
                        return (
                             <tr key={key} className="border-b border-gray-700 last:border-b-0">
                                <td className="px-4 py-1 font-semibold">{key}</td>
                                <td className="px-4 py-1 text-center font-mono">{baseWeight.toFixed(3)}</td>
                                <td className={`px-4 py-1 text-center font-mono font-bold ${colorClass}`}>
                                    {trainedWeight.toFixed(3)} 
                                    <span className="text-xs ml-2">({diff > 0 ? '+' : ''}{diff.toFixed(3)})</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const ModelTrainingDashboard: React.FC<ModelTrainingDashboardProps> = ({ onApplyWeights, currentWeights }) => {
    const [selectedDataset, setSelectedDataset] = useState<string>(datasets[0].id);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [progressText, setProgressText] = useState<string>('');
    const [report, setReport] = useState<TrainingReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Hyperparameters
    const [learningRate, setLearningRate] = useState(0.05);
    const [epochs, setEpochs] = useState(100);
    const [testSplit, setTestSplit] = useState(0.2);

    const handleStartTraining = async () => {
        setIsLoading(true);
        setError(null);
        setReport(null);
        setProgress(0);
        setProgressText('');

        const datasetToRun = datasets.find(d => d.id === selectedDataset)?.sessions;
        if (!datasetToRun) {
            setError("Selected dataset not found.");
            setIsLoading(false);
            return;
        }

        try {
            const trainingReport = await trainModel(datasetToRun, { learningRate, epochs, testSplit }, (p, message) => {
                setProgress(p);
                setProgressText(message);
            });
            setReport(trainingReport);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "An unknown error occurred during training.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportReport = () => {
        if (!report) return;
        const jsonContent = JSON.stringify(report, null, 2);
        const a = document.createElement('a');
        const file = new Blob([jsonContent], { type: 'application/json' });
        a.href = URL.createObjectURL(file);
        a.download = `training_report_${report.trainingDatasetName.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg shadow-2xl border border-gray-700 space-y-8">
            <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                    Logistic Regression Model Training
                </h2>
                <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-400">Status:</span>
                    {currentWeights === DEFAULT_MODEL_WEIGHTS 
                        ? <span className="font-semibold text-green-400">Using Default Model</span>
                        : <span className="font-semibold text-indigo-400">Custom Model Active</span>
                    }
                </div>
            </div>

            {/* --- Configuration --- */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 border-b border-gray-700 pb-8">
                <div className="md:col-span-3 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-300">1. Configuration</h3>
                     <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
                         <label htmlFor="dataset-select" className="block text-sm font-medium text-gray-400">
                            Select Training Dataset
                        </label>
                        <select
                            id="dataset-select"
                            value={selectedDataset}
                            onChange={(e) => setSelectedDataset(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                        >
                            {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.sessions.length} sessions)</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                             <label htmlFor="lr-input" className="block text-sm font-medium text-gray-400 mb-2">Learning Rate</label>
                             <input id="lr-input" type="number" value={learningRate} onChange={e=>setLearningRate(parseFloat(e.target.value))} step="0.01" className="w-full bg-gray-900 border border-gray-600 rounded-md p-2" disabled={isLoading} />
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                              <label htmlFor="epochs-input" className="block text-sm font-medium text-gray-400 mb-2">Epochs</label>
                             <input id="epochs-input" type="number" value={epochs} onChange={e=>setEpochs(parseInt(e.target.value))} step="10" className="w-full bg-gray-900 border border-gray-600 rounded-md p-2" disabled={isLoading} />
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <label htmlFor="test-split-input" className="block text-sm font-medium text-gray-400 mb-2">Test Split ({Math.round(testSplit*100)}%)</label>
                             <input id="test-split-input" type="range" value={testSplit} onChange={e=>setTestSplit(parseFloat(e.target.value))} min="0.1" max="0.5" step="0.05" className="w-full" disabled={isLoading} />
                        </div>
                     </div>
                </div>
                 <div className="md:col-span-2 space-y-4">
                     <h3 className="text-lg font-semibold text-gray-300">2. Run Training</h3>
                     <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-full flex flex-col justify-center">
                        <button
                            onClick={handleStartTraining}
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300 disabled:bg-gray-500 flex items-center justify-center space-x-2"
                        >
                            {isLoading ? <><SpinnerIcon /> <span>Training in Progress...</span></> : <><BrainIcon /><span>Start Training</span></>}
                        </button>
                         <p className="text-center text-xs text-gray-500 mt-3">
                            This may take several minutes depending on the dataset size.
                        </p>
                    </div>
                </div>
            </div>

            {isLoading && (
                 <div className="w-full bg-gray-700 rounded-full h-4 relative">
                    <div className="bg-indigo-500 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">{progressText}</span>
                </div>
            )}
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md">{error}</div>}

            {report && (
                <div className="space-y-8 animate-fade-in">
                    <h3 className="text-2xl font-bold text-gray-200">Training Complete</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                             <h4 className="text-lg font-semibold text-gray-300 mb-2">Training Loss (Cross-Entropy)</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={report.history} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis dataKey="epoch" stroke="#A0AEC0" />
                                    <YAxis stroke="#A0AEC0" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                                    <Line type="monotone" dataKey="loss" stroke="#8884d8" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                              <h4 className="text-lg font-semibold text-gray-300 mb-2">Final Model Weights</h4>
                              <WeightsTable trained={report.finalWeights} base={DEFAULT_MODEL_WEIGHTS} />
                        </div>
                    </div>
                     <div className="space-y-4">
                         <div className="flex justify-between items-center">
                             <h3 className="text-xl font-bold text-gray-200">
                                Test Set Performance ({report.testSetSize} sessions)
                            </h3>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={handleExportReport}
                                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center justify-center space-x-2"
                                >
                                    <DownloadIcon/><span>Export Report</span>
                                </button>
                                <button
                                    onClick={() => onApplyWeights(DEFAULT_MODEL_WEIGHTS)}
                                    disabled={currentWeights === DEFAULT_MODEL_WEIGHTS}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center justify-center space-x-2 disabled:bg-gray-500"
                                >
                                    <HistoryIcon/><span>Revert to Default</span>
                                </button>
                                <button
                                    onClick={() => onApplyWeights(report.finalWeights)}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center justify-center space-x-2"
                                >
                                    Apply Trained Model
                                </button>
                            </div>
                         </div>
                         <ValidationCharts 
                            report={{ 
                                metrics: report.testSetMetrics, 
                                results: report.testSetResults, 
                                datasetName: `Test set from ${datasets.find(d => d.id === selectedDataset)?.name}`
                            }}
                            dynamicMetrics={null} // Dynamic metrics are handled by the ValidationDashboard itself
                            threshold={0.5} // Show default 0.5 threshold metrics for the report
                         />
                     </div>
                </div>
            )}
        </div>
    );
};

export default ModelTrainingDashboard;
