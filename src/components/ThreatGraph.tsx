
import React, { useState, useEffect, useMemo } from 'react';
import type { AllSubnetsState, PromptAnalysis, GraphLink } from '../types';
import { checkPromptSimilarity } from '../services/geminiService';
import SpinnerIcon from './icons/SpinnerIcon';

const MAX_PAIRS_TO_ANALYZE = 50; // To prevent excessive API calls

interface TooltipData {
    content: string;
    x: number;
    y: number;
}

const getScoreColor = (score: number, type: 'fill' | 'stroke') => {
  const colors = {
    low: { fill: '#22c55e', stroke: '#16a34a' }, // green-500, green-600
    medium: { fill: '#facc15', stroke: '#eab308' }, // yellow-400, yellow-500
    high: { fill: '#ef4444', stroke: '#dc2626' }, // red-500, red-600
  };
  if (score < 0.3) return colors.low[type];
  if (score < 0.7) return colors.medium[type];
  return colors.high[type];
};

const ThreatGraph: React.FC<{ allSubnets: AllSubnetsState, onClose: () => void }> = ({ allSubnets, onClose }) => {
    const [links, setLinks] = useState<GraphLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progressText, setProgressText] = useState("Preparing analysis...");
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    const promptMap = useMemo(() => {
        const map = new Map<string, PromptAnalysis>();
        // FIX: Add explicit type for `prompts` to resolve type inference issue.
        Object.values(allSubnets).forEach((prompts: PromptAnalysis[]) => {
            prompts.forEach(p => map.set(`${p.subnet}-${p.id}`, p));
        });
        return map;
    }, [allSubnets]);

    const promptPairsToAnalyze = useMemo(() => {
        const subnets = Object.keys(allSubnets);
        const pairs: [PromptAnalysis, PromptAnalysis][] = [];

        // 1. Generate intra-subnet (non-sequential) pairs to find hidden links within a single session
        for (const subnetKey of subnets) {
            const promptsInSubnet = allSubnets[subnetKey];
            if (promptsInSubnet.length > 2) {
                for (let i = 0; i < promptsInSubnet.length; i++) {
                    // Start j from i+2 to skip checking adjacent prompts, whose relationship is already known
                    for (let j = i + 2; j < promptsInSubnet.length; j++) {
                        pairs.push([promptsInSubnet[i], promptsInSubnet[j]]);
                    }
                }
            }
        }

        // 2. Generate inter-subnet pairs to find links between different users
        if (subnets.length > 1) {
            for (let i = 0; i < subnets.length; i++) {
                for (let j = i + 1; j < subnets.length; j++) {
                    const subnetA = allSubnets[subnets[i]];
                    const subnetB = allSubnets[subnets[j]];
                    for (const promptA of subnetA) {
                        for (const promptB of subnetB) {
                            pairs.push([promptA, promptB]);
                        }
                    }
                }
            }
        }
        
        return pairs;
    }, [allSubnets]);

    useEffect(() => {
        const analyzeLinks = async () => {
            setError(null);
            setIsLoading(true);
            setLinks([]);
            setProgressText("Preparing analysis...");
            
            const pairsToAnalyze = [...promptPairsToAnalyze].sort(() => Math.random() - 0.5).slice(0, MAX_PAIRS_TO_ANALYZE);

            if(pairsToAnalyze.length === 0) {
                setIsLoading(false);
                setProgressText("Not enough prompts to analyze for semantic links.");
                return;
            }

            const foundLinks: GraphLink[] = [];
            for (let i = 0; i < pairsToAnalyze.length; i++) {
                const [promptA, promptB] = pairsToAnalyze[i];
                setProgressText(`Analyzing pair ${i + 1} of ${pairsToAnalyze.length}...`);
                try {
                    const result = await checkPromptSimilarity(promptA.text, promptB.text);
                    if (result.similar) {
                        foundLinks.push({
                            source: { subnet: promptA.subnet, promptId: promptA.id },
                            target: { subnet: promptB.subnet, promptId: promptB.id },
                            justification: result.justification,
                        });
                        setLinks([...foundLinks]); // Update state incrementally
                    }
                } catch (e) {
                     console.error("Error analyzing prompt pair:", e);
                     setError(e instanceof Error ? e.message : "An API error occurred during analysis.");
                }
            }
            setIsLoading(false);
            setProgressText(`Analysis complete. Found ${foundLinks.length} semantic link(s).`);
        };

        analyzeLinks();
    }, [promptPairsToAnalyze]);

    const layout = useMemo(() => {
        const positions = new Map<string, { x: number, y: number }>();
        const PADDING = 60;
        const COLUMN_WIDTH = 250;
        const ROW_HEIGHT = 80;
        const NODE_RADIUS = 15;

        Object.keys(allSubnets).forEach((subnet, colIndex) => {
            allSubnets[subnet].forEach((prompt, rowIndex) => {
                const key = `${subnet}-${prompt.id}`;
                positions.set(key, {
                    x: PADDING + colIndex * COLUMN_WIDTH,
                    y: PADDING + rowIndex * ROW_HEIGHT + NODE_RADIUS,
                });
            });
        });
        return positions;
    }, [allSubnets]);

    const handleMouseEnterNode = (e: React.MouseEvent, prompt: PromptAnalysis) => {
        setTooltip({
            content: `Subnet: ${prompt.subnet}\nScore: ${prompt.score.toFixed(2)}\nPrompt: "${prompt.text}"`,
            x: e.clientX + 15,
            y: e.clientY,
        });
    };
     const handleMouseEnterLink = (e: React.MouseEvent, link: GraphLink) => {
        setTooltip({
            content: `Semantic Link Justification:\n${link.justification}`,
            x: e.clientX,
            y: e.clientY,
        });
    };
    const handleMouseLeave = () => setTooltip(null);

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-11/12 h-5/6 flex flex-col p-4">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                        Semantic Threat Graph
                    </h2>
                     <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="flex-grow bg-gray-900/50 rounded relative overflow-auto">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                           <SpinnerIcon/>
                           <p className="mt-2">{progressText}</p>
                        </div>
                    )}
                    
                    {!isLoading && error && <div className="p-4 text-red-400">{error}</div>}

                    <svg width="100%" height="100%">
                        {/* Render Subnet Titles */}
                        {Object.keys(allSubnets).map((subnet, colIndex) => (
                           <text 
                            key={subnet}
                            x={60 + colIndex * 250 - 20}
                            y="30"
                            fill="#818cf8"
                            fontSize="14"
                            fontWeight="bold"
                            fontFamily="monospace"
                           >
                            {subnet}
                           </text> 
                        ))}

                        {/* Render intra-subnet sequential links */}
                        {/* FIX: Use `map` instead of `forEach` to render elements. Add explicit type for `prompts` to fix type error. */}
                        {Object.values(allSubnets).map((prompts: PromptAnalysis[]) => 
                            prompts.slice(0, -1).map((p1, i) => {
                                const p2 = prompts[i+1];
                                const pos1 = layout.get(`${p1.subnet}-${p1.id}`);
                                const pos2 = layout.get(`${p2.subnet}-${p2.id}`);
                                if(!pos1 || !pos2) return null;
                                const key = `seq-${p1.subnet}-${p1.id}-${p2.id}`;
                                return (
                                    <line key={key} x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y} stroke="#4b5563" strokeDasharray="3 3" />
                                );
                            })
                        )}
                        
                         {/* Render semantic links */}
                        {links.map((link, i) => {
                             const sourceKey = `${link.source.subnet}-${link.source.promptId}`;
                             const targetKey = `${link.target.subnet}-${link.target.promptId}`;
                             const sourcePos = layout.get(sourceKey);
                             const targetPos = layout.get(targetKey);
                             if (!sourcePos || !targetPos) return null;
                             
                             const isIntraSubnet = link.source.subnet === link.target.subnet;
                             const strokeColor = isIntraSubnet ? '#facc15' : '#ef4444'; // yellow-400 for intra, red-500 for inter
                             const strokeDasharray = isIntraSubnet ? '5 5' : 'none';

                             return (
                                <line 
                                    key={i} 
                                    x1={sourcePos.x} y1={sourcePos.y} 
                                    x2={targetPos.x} y2={targetPos.y} 
                                    stroke={strokeColor}
                                    strokeDasharray={strokeDasharray}
                                    strokeWidth="2" 
                                    className="cursor-pointer"
                                    onMouseEnter={(e) => handleMouseEnterLink(e, link)}
                                    onMouseLeave={handleMouseLeave}
                                 />
                             );
                        })}

                        {/* Render nodes */}
                        {Array.from(promptMap.keys()).map(key => {
                             const prompt = promptMap.get(key);
                             const pos = layout.get(key);
                             if (!prompt || !pos) return null;
                             return (
                                <g key={key}>
                                    <circle 
                                        cx={pos.x} 
                                        cy={pos.y} 
                                        r={15}
                                        fill={getScoreColor(prompt.score, 'fill')} 
                                        stroke={getScoreColor(prompt.score, 'stroke')}
                                        strokeWidth="2"
                                        className="cursor-pointer"
                                        onMouseEnter={(e) => handleMouseEnterNode(e, prompt)}
                                        onMouseLeave={handleMouseLeave}
                                    />
                                     <text x={pos.x} y={pos.y + 4} fill="white" textAnchor="middle" fontSize="10" fontWeight="bold" pointerEvents="none">P{prompt.id}</text>
                                </g>
                             )
                        })}
                    </svg>

                     {tooltip && (
                        <div
                            className="absolute bg-gray-900 text-white text-xs p-2 rounded-md shadow-lg border border-gray-600 whitespace-pre-wrap max-w-xs"
                            style={{ top: tooltip.y, left: tooltip.x, transform: 'translateY(-100%)' }}
                        >
                            {tooltip.content}
                        </div>
                    )}
                </div>
                 <div className="text-center text-xs text-gray-500 pt-2">
                    {isLoading ? progressText : progressText}
                    {promptPairsToAnalyze.length > MAX_PAIRS_TO_ANALYZE && !isLoading && ` (Sampled ${MAX_PAIRS_TO_ANALYZE} of ${promptPairsToAnalyze.length} possible pairs for analysis)`}
                 </div>
            </div>
        </div>
    );
};

export default ThreatGraph;
