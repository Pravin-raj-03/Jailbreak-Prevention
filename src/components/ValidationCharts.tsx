
import React, { useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, ReferenceLine, BarChart, Bar, Dot } from 'recharts';
import type { ValidationReport, ThresholdMetrics } from '../types';
import CameraIcon from './icons/CameraIcon';
import { calculateMetricsForThreshold } from '../services/validationService';

const exportToPng = async (element: HTMLElement | null, fileName: string) => {
    if (!element) {
        console.error("Export failed: target element not found.");
        return;
    }

    // Temporarily increase resolution for higher quality export
    const scale = 2;
    const originalStyle = {
        width: element.style.width,
        height: element.style.height,
        transform: element.style.transform,
    };
    element.style.width = `${element.offsetWidth * scale}px`;
    element.style.height = `${element.offsetHeight * scale}px`;
    element.style.transform = `scale(${1/scale})`;
    element.style.transformOrigin = 'top left';


    const svgElement = element.querySelector('svg');

    // For non-chart elements, we'll capture the element itself.
    const targetNode = svgElement || element;

    try {
        const { width, height } = targetNode.getBoundingClientRect();
        
        // Use a polyfill-like approach for converting SVG to data URL
        const svgString = new XMLSerializer().serializeToString(targetNode);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Use clientWidth/Height for elements scaled by CSS transforms
            canvas.width = element.clientWidth * scale;
            canvas.height = element.clientHeight * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.fillStyle = 'rgb(31 41 55)'; // bg-gray-800
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            
            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${fileName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Restore original styles
            element.style.width = originalStyle.width;
            element.style.height = originalStyle.height;
            element.style.transform = originalStyle.transform;
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            console.error("Failed to load SVG image for PNG conversion.");
            // Restore original styles on error
            element.style.width = originalStyle.width;
            element.style.height = originalStyle.height;
            element.style.transform = originalStyle.transform;
        }
        img.src = url;

    } catch (error) {
        console.error('Export to PNG failed:', error);
         // Restore original styles on error
        element.style.width = originalStyle.width;
        element.style.height = originalStyle.height;
        element.style.transform = originalStyle.transform;
    }
};


const ChartCard: React.FC<{ title: string; children: React.ReactNode; description?: string; exportRef: React.RefObject<HTMLDivElement>; fileName: string; }> = ({ title, children, description, exportRef, fileName }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 h-full flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold text-gray-300">{title}</h4>
            <button onClick={() => exportToPng(exportRef.current, fileName)} className="text-gray-400 hover:text-white transition-colors" title="Export as PNG">
                <CameraIcon />
            </button>
        </div>
        <div ref={exportRef} className="flex-grow w-full h-64 bg-gray-800">
             {children}
        </div>
        {description && <p className="text-xs text-gray-500 mt-2 text-center">{description}</p>}
    </div>
);


const MetricsTable: React.FC<{ metrics: ThresholdMetrics }> = ({ metrics }) => {
    const { perClassMetrics, accuracy, mcc, specificity } = metrics;
    return (
        <div className="text-sm text-gray-300">
            <div className="grid grid-cols-5 gap-px bg-gray-700 border border-gray-700 rounded-lg overflow-hidden text-center">
                {/* Header */}
                <div className="p-2 font-semibold bg-gray-900/70">Class</div>
                <div className="p-2 font-semibold bg-gray-900/70">Precision</div>
                <div className="p-2 font-semibold bg-gray-900/70">Recall</div>
                <div className="p-2 font-semibold bg-gray-900/70">F1-Score</div>
                <div className="p-2 font-semibold bg-gray-900/70">Support</div>
                
                {/* Safe Class */}
                <div className="p-2 font-bold bg-gray-800 text-green-400">Safe</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Safe.precision.toFixed(3)}</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Safe.recall.toFixed(3)}</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Safe.f1Score.toFixed(3)}</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Safe.support}</div>
                
                {/* Harmful Class */}
                <div className="p-2 font-bold bg-gray-800 text-red-400">Harmful</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Harmful.precision.toFixed(3)}</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Harmful.recall.toFixed(3)}</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Harmful.f1Score.toFixed(3)}</div>
                <div className="p-2 font-mono bg-gray-800">{perClassMetrics.Harmful.support}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div className="bg-gray-900/50 p-3 rounded-md">
                    <div className="text-xs text-gray-400">Accuracy</div>
                    <div className="text-xl font-bold text-indigo-400">{accuracy.toFixed(3)}</div>
                </div>
                 <div className="bg-gray-900/50 p-3 rounded-md">
                    <div className="text-xs text-gray-400">Specificity</div>
                    <div className="text-xl font-bold text-indigo-400">{specificity.toFixed(3)}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-md">
                    <div className="text-xs text-gray-400">MCC</div>
                    <div className="text-xl font-bold text-indigo-400">{mcc.toFixed(3)}</div>
                </div>
            </div>
        </div>
    );
};

const ConfusionMatrixDisplay: React.FC<{ cm: ThresholdMetrics['confusionMatrix'] }> = ({ cm }) => {
    return (
        <div>
            <div className="absolute top-2 left-2 text-xs text-gray-400 -rotate-45 -translate-x-4">Actual</div>
            <div className="absolute top-2 right-10 text-xs text-gray-400">Predicted</div>
            <div className="grid grid-cols-2 gap-px bg-gray-700 border border-gray-700 rounded-lg overflow-hidden text-center">
                <div className="bg-gray-900 p-2 text-sm text-gray-400 font-bold">Harmful</div>
                <div className="bg-gray-900 p-2 text-sm text-gray-400 font-bold">Safe</div>

                <div className="bg-green-900/30 p-4 relative">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold -rotate-90">Harmful</div>
                    <div className="font-bold text-xl text-white">{cm.truePositive}</div>
                    <div className="text-xs text-green-300">True Positive</div>
                </div>
                 <div className="bg-red-900/30 p-4">
                    <div className="font-bold text-xl text-white">{cm.falseNegative}</div>
                    <div className="text-xs text-red-300">False Negative</div>
                </div>

                 <div className="bg-red-900/30 p-4 relative">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold -rotate-90">Safe</div>
                    <div className="font-bold text-xl text-white">{cm.falsePositive}</div>
                    <div className="text-xs text-red-300">False Positive</div>
                </div>
                <div className="bg-green-900/30 p-4">
                    <div className="font-bold text-xl text-white">{cm.trueNegative}</div>
                    <div className="text-xs text-green-300">True Negative</div>
                </div>
            </div>
        </div>
    );
};

const CustomDot: React.FC<any> = (props) => {
  const { cx, cy, stroke, payload, value, show } = props;
  if (!show) return null;
  return (
    <svg x={cx - 10} y={cy - 10} width="20" height="20" fill="white" viewBox="0 0 1024 1024">
        <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 928C282.3 928 96 741.7 96 512S282.3 96 512 96s416 186.3 416 416-186.3 416-416 416zm0-192c123.7 0 224-100.3 224-224S635.7 288 512 288 288 388.3 288 512s100.3 224 224 224z" fill="#a78bfa"/>
    </svg>
  );
};

const ValidationCharts: React.FC<{ report: ValidationReport, dynamicMetrics: ThresholdMetrics | null, threshold: number }> = ({ report, dynamicMetrics, threshold }) => {

    const metrics = dynamicMetrics || report.metrics;

    const refs = {
        metrics: useRef<HTMLDivElement>(null),
        confusionMatrix: useRef<HTMLDivElement>(null),
        distribution: useRef<HTMLDivElement>(null),
        roc: useRef<HTMLDivElement>(null),
        pr: useRef<HTMLDivElement>(null),
    };

    const scoreDistributionData = useMemo(() => {
        const bins: { range: string; Safe: number, Harmful: number }[] = Array.from({ length: 10 }, (_, i) => ({
            range: `${(i * 0.1).toFixed(1)}-${((i + 1) * 0.1).toFixed(1)}`,
            Safe: 0,
            Harmful: 0,
        }));

        report.results.forEach(res => {
            const binIndex = Math.min(Math.floor(res.sessionRiskScore * 10), 9);
            bins[binIndex][res.groundTruth]++;
        });

        return bins;

    }, [report.results]);
    
    const thresholdPoint = useMemo(() => {
        const metricsAtThreshold = calculateMetricsForThreshold(report.results, threshold);
        const tpr = metricsAtThreshold.recall; // Recall for the 'Harmful' class is the True Positive Rate
        const fpr = 1 - metricsAtThreshold.specificity; // Specificity is the True Negative Rate, so 1 - TNR = FPR
        return { fpr, tpr };
    }, [report.results, threshold]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Classification Metrics" exportRef={refs.metrics} fileName="classification-metrics">
                 <div className="flex items-center justify-center h-full">
                    <MetricsTable metrics={metrics} />
                </div>
            </ChartCard>
            <ChartCard title="Confusion Matrix" exportRef={refs.confusionMatrix} fileName="confusion-matrix">
                 <div className="flex items-center justify-center h-full relative">
                    <ConfusionMatrixDisplay cm={metrics.confusionMatrix} />
                </div>
            </ChartCard>
            <ChartCard title="Risk Score Distribution" description="Distribution of predicted scores for each ground truth class." exportRef={refs.distribution} fileName="score-distribution">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistributionData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis dataKey="range" stroke="#A0AEC0">
                            <Label value="Session Risk Score" offset={-15} position="insideBottom" fill="#A0AEC0"/>
                        </XAxis>
                        <YAxis stroke="#A0AEC0">
                             <Label value="Count" angle={-90} position="insideLeft" fill="#A0AEC0" />
                        </YAxis>
                        <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                        <Legend wrapperStyle={{ color: '#A0AEC0' }} />
                        <Bar dataKey="Safe" stackId="a" fill="#22c55e" />
                        <Bar dataKey="Harmful" stackId="a" fill="#ef4444" />
                        <ReferenceLine x={threshold * 10 - 0.5} stroke="white" strokeDasharray="3 3" strokeWidth={2}>
                           <Label value="Threshold" position="top" fill="white" fontSize="10px"/>
                        </ReferenceLine>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
             <ChartCard title={`ROC Curve (AUC = ${report.metrics.auc.toFixed(3)})`} description="True Positive Rate vs. False Positive Rate." exportRef={refs.roc} fileName="roc-curve">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report.metrics.rocCurve} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis type="number" dataKey="fpr" stroke="#A0AEC0" domain={[0, 1]}>
                             <Label value="False Positive Rate" offset={-15} position="insideBottom" fill="#A0AEC0"/>
                        </XAxis>
                        <YAxis stroke="#A0AEC0" domain={[0, 1]}>
                            <Label value="True Positive Rate" angle={-90} position="insideLeft" fill="#A0AEC0" />
                        </YAxis>
                        <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                        <Legend wrapperStyle={{ color: '#A0AEC0' }}/>
                        <Line type="monotone" dataKey="tpr" name="ROC" stroke="#8884d8" strokeWidth={2} dot={false} />
                        <ReferenceLine x={0.5} y={0.5} strokeDasharray="3 3" stroke="grey" ifOverflow="visible" segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} />
                        {report.metrics.rocCurve.map((entry, index) => (
                           <Dot key={index} cx={entry.fpr} cy={entry.tpr} r={0} />
                        ))}
                         <Line type="monotone" dataKey="tpr" stroke="transparent" activeDot={false} dot={<CustomDot show={true} />} data={[thresholdPoint]} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Precision-Recall Curve" description="Precision vs. Recall across different thresholds." exportRef={refs.pr} fileName="pr-curve">
                <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={report.metrics.prCurve} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                        <XAxis type="number" dataKey="recall" stroke="#A0AEC0" domain={[0, 1]}>
                             <Label value="Recall" offset={-15} position="insideBottom" fill="#A0AEC0"/>
                        </XAxis>
                        <YAxis stroke="#A0AEC0" domain={[0, 1]}>
                             <Label value="Precision" angle={-90} position="insideLeft" fill="#A0AEC0" />
                        </YAxis>
                        <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                        <Legend wrapperStyle={{ color: '#A0AEC0' }}/>
                        <Line type="monotone" dataKey="precision" name="PR" stroke="#82ca9d" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    );
};

export default ValidationCharts;
