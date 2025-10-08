export interface IndividualAnalysisResult {
  score: number;
  justification: string;
  isJailbreak: boolean;
  attackCategories: string[];
}

export interface ModerationResult {
  blocked: boolean;
  reason: string;
}

export interface PromptAnalysis extends IndividualAnalysisResult {
  id: number;
  text: string;
  subnet: string;
  moderationReason?: string;
}

export interface SessionAnalysisResult {
  sessionRiskScore: number;
  classification: 'Safe' | 'Harmful' | 'Potentially Harmful' | 'Unknown';
}


// --- Multi-User Threat Intel Types ---

export interface AllSubnetsState {
  [subnet: string]: PromptAnalysis[];
}

export interface SubnetAnalysisResult {
    groupRiskScore: number;
    classification: 'Safe' | 'Suspicious Activity' | 'Coordinated Threat' | 'Unknown';
    justification: string;
}

// --- Threat Graph Types ---
export interface GraphLink {
  source: { subnet: string; promptId: number; };
  target: { subnet: string; promptId: number; };
  justification: string;
}


// --- Validation Types ---

export interface ValidationSession {
  id: string;
  name: string;
  prompts: string[];
  groundTruth: 'Safe' | 'Harmful';
}

export interface ValidationResultItem {
  sessionId: string;
  prompts: string[];
  groundTruth: 'Safe' | 'Harmful';
  prediction: SessionAnalysisResult['classification'];
  sessionRiskScore: number;
  isCorrect: boolean;
}

export interface ConfusionMatrix {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
}

export interface ROCPoint {
    fpr: number;
    tpr: number;
}

export interface PRPoint {
    recall: number;
    precision: number;
}

export interface ClassMetrics {
    precision: number;
    recall: number;
    f1Score: number;
    support: number;
}

export interface ThresholdMetrics {
    accuracy: number;
    precision: number; // Macro-average for the positive class 'Harmful'
    recall: number;    // Macro-average for the positive class 'Harmful'
    f1Score: number;   // Macro-average for the positive class 'Harmful'
    specificity: number; // True Negative Rate
    mcc: number; // Matthews Correlation Coefficient
    confusionMatrix: ConfusionMatrix;
    perClassMetrics: {
        Safe: ClassMetrics;
        Harmful: ClassMetrics;
    }
}

export interface ValidationMetrics extends ThresholdMetrics {
  rocCurve: ROCPoint[];
  auc: number;
  prCurve: PRPoint[];
}


export interface ValidationReport {
  metrics: ValidationMetrics;
  results: ValidationResultItem[];
  datasetName: string;
}

// --- Model Training Types ---

export interface ModelWeights {
  sessionLength: number;
  lastScore: number;
  maxScore: number;
  averageScore: number;
  trend: number;
  highRiskCount: number;
  scoreVolatility: number;
  intercept: number;
}

export interface TrainingHistoryPoint {
    epoch: number;
    loss: number;
}

export interface TrainingReport {
    finalWeights: ModelWeights;
    history: TrainingHistoryPoint[];
    testSetMetrics: ValidationMetrics;
    testSetResults: ValidationResultItem[];
    trainingDatasetName: string;
    testSetSize: number;
    trainingSetSize: number;
    hyperparameters: {
        learningRate: number;
        epochs: number;
        testSplit: number;
    }
}
