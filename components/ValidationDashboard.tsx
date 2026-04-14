
import React, { useState, useEffect } from 'react';
import { runValidation, calculateMetrics, calculateMetricsForThreshold } from '../services/validationService';
import { datasets, gibbsJailbreakSample } from '../data/datasets';
import type { ValidationReport, ValidationSession, ThresholdMetrics } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ValidationCharts from './ValidationCharts';
import DownloadIcon from './icons/DownloadIcon';
import UploadIcon from './icons/UploadIcon';

const ValidationDashboard: React.FC = () => {
    const [selectedDataset, setSelectedDataset] = useState<string>(datasets[0].id);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [progressText, setProgressText] = useState<string>('');
    const [report, setReport] = useState<ValidationReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadedSessions, setUploadedSessions] = useState<ValidationSession[] | null>(null);

    const [threshold, setThreshold] = useState<number>(0.5);
    const [dynamicMetrics, setDynamicMetrics] = useState<ThresholdMetrics | null>(null);

    useEffect(() => {
        if (report?.results) {
            const newMetrics = calculateMetricsForThreshold(report.results, threshold);
            setDynamicMetrics(newMetrics);
        }
    }, [report, threshold]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        parseAndSetFile(file);
    };
    
    const parseAndSetFile = (file: File) => {
        setError(null);
        setUploadedSessions(null);
        setReport(null);
        setUploadedFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const rows = text.split('\n').filter(row => row.trim() !== '');
                const headerRow = rows.shift()?.trim().toLowerCase().split(',');
                
                const requiredHeaders = ['id', 'name', 'prompts', 'groundtruth'];
                if (!headerRow || !requiredHeaders.every(h => headerRow.includes(h))) {
                    throw new Error(`Invalid CSV headers. Must include ${requiredHeaders.join(', ')}.`);
                }

                const headerMap = {
                    id: headerRow.indexOf('id'),
                    name: headerRow.indexOf('name'),
                    prompts: headerRow.indexOf('prompts'),
                    groundTruth: headerRow.indexOf('groundtruth'),
                };

                const sessions: ValidationSession[] = rows.map((rowStr, index) => {
                    const columns = parseCsvRow(rowStr.trim());
                    
                    const promptsRaw = columns[headerMap.prompts];
                    let prompts: string[] = [];
                    try {
                        prompts = JSON.parse(promptsRaw);
                        if (!Array.isArray(prompts)) throw new Error();
                    } catch {
                        throw new Error(`Invalid JSON in 'prompts' column for row ${index + 2}. Expected a string array like "[\"prompt1\",\"prompt2\"]".`);
                    }

                    const groundTruth = columns[headerMap.groundTruth] as 'Safe' | 'Harmful';
                     if (!['Safe', 'Harmful'].includes(groundTruth)) {
                        throw new Error(`Invalid 'groundTruth' value in row ${index + 2}. Must be 'Safe' or 'Harmful'.`);
                    }

                    return {
                        id: columns[headerMap.id],
                        name: columns[headerMap.name],
                        prompts,
                        groundTruth,
                    };
                });
                setUploadedSessions(sessions);
            } catch (err) {
                setError(`Error parsing CSV: ${err.message}`);
                setUploadedFile(null);
            }
        };
        reader.readAsText(file);
    };

    // A simple CSV row parser that handles quoted fields containing commas.
    const parseCsvRow = (rowString: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < rowString.length; i++) {
            const char = rowString[i];
            if (char === '"' && (i === 0 || rowString[i-1] !== '\\')) {
                 if (inQuotes && rowString[i+1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result.map(s => s.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    }

    const handleRunValidation = async () => {
        setIsLoading(true);
        setError(null);
        setReport(null);
        setProgress(0);
        setProgressText('');
        setThreshold(0.5);

        const datasetToRun = uploadedSessions || datasets.find(d => d.id === selectedDataset)?.sessions;
        const datasetName = uploadedFile?.name || datasets.find(d => d.id === selectedDataset)?.name || 'Unknown Dataset';

        if (!datasetToRun) {
            setError("No dataset available to run.");
            setIsLoading(false);
            return;
        }

        try {
            const results = await runValidation(datasetToRun, (p, current, total) => {
                setProgress(p);
                setProgressText(`${current} / ${total}`);
            });
            const metrics = calculateMetrics(results);
            setReport({
                metrics,
                results,
                datasetName,
            });
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "An unknown error occurred during validation.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadSample = () => {
        const headers = ['id', 'name', 'prompts', 'groundTruth'];
        const csvRows = [headers.join(',')];
        
        gibbsJailbreakSample.forEach(session => {
            // JSON stringify and then wrap in quotes, escaping internal quotes.
            const promptsJson = JSON.stringify(session.prompts);
            const escapedPrompts = `"${promptsJson.replace(/"/g, '""')}"`;
            const row = [session.id, `"${session.name}"`, escapedPrompts, session.groundTruth].join(',');
            csvRows.push(row);
        });

        downloadFile(csvRows.join('\n'), 'gibbs_sample_dataset.csv', 'text/csv');
    };

    const handleExport = () => {
        if (!report) return;
        // Use the metrics for the currently selected threshold for the export
        const metricsToExport = dynamicMetrics || report.metrics;
        const metricsJson = JSON.stringify({ datasetName: report.datasetName, metrics: metricsToExport, threshold }, null, 2);
        downloadFile(metricsJson, 'validation_report_metrics.json', 'application/json');

        const headers = ['sessionId', 'groundTruth', 'prediction_text', 'prediction_at_threshold', 'sessionRiskScore', 'isCorrect_at_threshold'];
        const csvRows = [headers.join(',')];
        report.results.forEach(res => {
            const predictionAtThreshold = res.sessionRiskScore >= threshold ? 'Harmful' : 'Safe';
            const isCorrectAtThreshold = predictionAtThreshold === res.groundTruth;
            const row = [res.sessionId, res.groundTruth, res.prediction, predictionAtThreshold, res.sessionRiskScore.toFixed(4), isCorrectAtThreshold].join(',');
            csvRows.push(row);
        });
        downloadFile(csvRows.join('\n'), 'validation_report_results.csv', 'text/csv');
    };

    const downloadFile = (content: string, fileName: string, contentType: string) => {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg shadow-2xl border border-gray-700 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dataset Selection */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-300">1. Select Validation Data</h3>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <label htmlFor="dataset-select" className="block text-sm font-medium text-gray-400 mb-2">
                            Select a built-in sample dataset
                        </label>
                        <select
                            id="dataset-select"
                            value={selectedDataset}
                            onChange={(e) => { setSelectedDataset(e.target.value); setUploadedFile(null); setUploadedSessions(null); setReport(null);}}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading || !!uploadedFile}
                        >
                            {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.sessions.length} sessions)</option>)}
                        </select>
                         {uploadedFile && <p className="text-xs text-gray-500 mt-2">Disable 'Use Uploaded File' to re-enable.</p>}
                    </div>
                    <div className="text-center text-gray-500 font-bold">OR</div>
                     <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
                        <label className="block text-sm font-medium text-gray-400">
                            Upload a CSV file for bulk validation
                        </label>
                        <div 
                            className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                            onClick={() => document.getElementById('csv-upload')?.click()}
                        >
                            <input type="file" id="csv-upload" className="hidden" accept=".csv" onChange={handleFileChange} />
                            <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                                <UploadIcon />
                                {uploadedFile ? 
                                    <span className="text-green-400">{uploadedFile.name} ({uploadedSessions?.length || 0} sessions)</span> :
                                    <span>Drag & drop or click to upload</span>
                                }
                            </div>
                        </div>
                        <button onClick={handleDownloadSample} className="text-sm text-indigo-400 hover:underline w-full">Download Sample CSV Template</button>
                    </div>
                </div>

                {/* Run Control */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-gray-300">2. Run and Analyze</h3>
                     <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-full flex flex-col justify-center">
                        <button
                            onClick={handleRunValidation}
                            disabled={isLoading || (!uploadedSessions && !selectedDataset)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md transition-colors duration-300 disabled:bg-gray-500 flex items-center justify-center space-x-2"
                        >
                            {isLoading ? <><SpinnerIcon /> <span>Running Validation...</span></> : <span>Run Validation</span>}
                        </button>
                         <p className="text-center text-xs text-gray-500 mt-3">
                            {uploadedSessions ? `Will run on uploaded file: ${uploadedFile?.name}` : `Will run on selected dataset: ${datasets.find(d=>d.id === selectedDataset)?.name}`}
                        </p>
                    </div>
                </div>
            </div>

            {isLoading && (
                 <div className="w-full bg-gray-700 rounded-full h-4 relative">
                    <div className="bg-indigo-500 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">{Math.round(progress)}% {progressText && `(${progressText})`}</span>
                </div>
            )}
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md">{error}</div>}

            {report && (
                <div className="space-y-8 animate-fade-in pt-8 border-t border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                            Report: {report.datasetName}
                        </h3>
                         <button
                            onClick={handleExport}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center justify-center space-x-2"
                        >
                            <DownloadIcon />
                            <span>Export Report</span>
                        </button>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <label htmlFor="threshold-slider" className="block text-sm font-medium text-gray-300 mb-2">
                            Classification Threshold: <span className="font-bold text-lg text-indigo-400">{threshold.toFixed(2)}</span>
                        </label>
                         <input
                            id="threshold-slider"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">Adjust the risk score threshold for classifying a session as 'Harmful'.</p>
                    </div>

                    <ValidationCharts 
                        report={report} 
                        dynamicMetrics={dynamicMetrics}
                        threshold={threshold}
                    />

                    <div>
                        <h4 className="text-lg font-semibold mb-2 text-gray-300">Prediction Details</h4>
                        <div className="max-h-[400px] overflow-y-auto bg-gray-900/50 p-2 rounded-lg border border-gray-700">
                                <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Session</th>
                                        <th scope="col" className="px-4 py-3">Ground Truth</th>
                                        <th scope="col" className="px-4 py-3">Initial Prediction</th>
                                        <th scope="col" className="px-4 py-3 text-center">Score</th>
                                        <th scope="col" className="px-4 py-3 text-center">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.results.map(res => (
                                        <tr key={res.sessionId} className="border-b border-gray-700 hover:bg-gray-800/50">
                                            <td className="px-4 py-2 font-medium text-gray-300">{res.sessionId}</td>
                                            <td className={`px-4 py-2 font-semibold ${res.groundTruth === 'Harmful' ? 'text-red-400' : 'text-green-400'}`}>{res.groundTruth}</td>
                                            <td className={`px-4 py-2 font-semibold ${res.prediction.includes('Harmful') ? 'text-yellow-400' : 'text-green-400'}`}>{res.prediction}</td>
                                            <td className="px-4 py-2 text-center font-mono text-gray-300">{res.sessionRiskScore.toFixed(2)}</td>
                                            <td className="px-4 py-2 flex justify-center">
                                                {res.isCorrect ? <CheckCircleIcon /> : <XCircleIcon />}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ValidationDashboard;