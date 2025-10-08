import type { PromptAnalysis, SessionAnalysisResult, ModelWeights, ValidationSession, ValidationResultItem, TrainingReport } from '../types';
import { analyzePromptRisk } from './geminiService';
import { calculateMetrics } from './validationService';

// A robust, professionally-tuned set of weights for the logistic regression model.
// This model uses all available features and is balanced to avoid penalizing safe, multi-turn conversations.
export const DEFAULT_MODEL_WEIGHTS: ModelWeights = {
  sessionLength: 0.1,
  lastScore: 1.5,
  maxScore: 2.5,      // The single most harmful prompt is a very strong signal.
  averageScore: 1.0,
  trend: 2.0,         // A rising trend in risk is a major indicator of an attack.
  highRiskCount: 2.0, // Multiple high-risk prompts are a clear sign of malicious intent.
  scoreVolatility: 1.0, // High volatility can indicate system probing.
  intercept: -4.0,    // A negative intercept ensures a low baseline risk for safe prompts.
};


type FeatureVector = Omit<ModelWeights, 'intercept'>;
type Features = keyof FeatureVector;

/**
 * Calculates the trend of risk scores.
 * A positive value indicates an increasing risk trend.
 */
const calculateTrend = (scores: number[]): number => {
  if (scores.length < 2) return 0;
  // Simple linear trend: (last - first) / (n-1)
  return (scores[scores.length - 1] - scores[0]) / (scores.length - 1);
};

/**
 * Calculates the standard deviation of scores (volatility).
 */
const calculateVolatility = (scores: number[]): number => {
  if (scores.length < 2) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
};

/**
 * Extracts a feature vector from a sequence of prompt analyses.
 */
export const extractFeatures = (prompts: PromptAnalysis[]): FeatureVector => {
  if (prompts.length === 0) {
    return { sessionLength: 0, lastScore: 0, maxScore: 0, averageScore: 0, trend: 0, highRiskCount: 0, scoreVolatility: 0 };
  }
  const scores = prompts.map(p => p.score);
  const HIGH_RISK_THRESHOLD = 0.7;

  return {
    sessionLength: prompts.length,
    lastScore: scores[scores.length - 1] || 0,
    maxScore: Math.max(...scores),
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    trend: calculateTrend(scores),
    highRiskCount: scores.filter(s => s >= HIGH_RISK_THRESHOLD).length,
    scoreVolatility: calculateVolatility(scores),
  };
};

/**
 * The sigmoid function, which maps any real number to the (0, 1) interval.
 */
const sigmoid = (z: number): number => {
  return 1 / (1 + Math.exp(-z));
};

/**
 * Predicts session risk from a pre-calculated feature vector.
 */
const predictFromFeatures = (features: FeatureVector, weights: ModelWeights): SessionAnalysisResult => {
    const logit = (Object.keys(features) as Features[]).reduce((acc, key) => {
        return acc + features[key] * weights[key];
    }, weights.intercept);

    const sessionRiskScore = sigmoid(logit);

    let classification: SessionAnalysisResult['classification'];
    if (sessionRiskScore >= 0.8) classification = 'Harmful';
    else if (sessionRiskScore >= 0.4) classification = 'Potentially Harmful';
    else classification = 'Safe';

    return { sessionRiskScore, classification };
}


/**
 * Predicts session risk using a logistic regression model with provided weights.
 */
export const predictSessionRiskWithLocalModel = (prompts: PromptAnalysis[], weights: ModelWeights): SessionAnalysisResult => {
  if (prompts.length === 0) {
    return { sessionRiskScore: 0, classification: 'Safe' };
  }
  const features = extractFeatures(prompts);
  return predictFromFeatures(features, weights);
};


// --- MODEL TRAINING FUNCTIONS ---

type ProcessedSession = {
    features: FeatureVector;
    label: number; // 0 for Safe, 1 for Harmful
    session: ValidationSession;
}

/**
 * Trains a logistic regression model using gradient descent.
 */
export async function trainModel(
    sessions: ValidationSession[],
    hyperparameters: { learningRate: number, epochs: number, testSplit: number },
    progressCallback: (progress: number, message: string) => void
): Promise<TrainingReport> {
    
    // --- 1. Data Preparation ---
    progressCallback(0, "Analyzing prompts...");
    const processedData: ProcessedSession[] = [];
    for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        let currentPrompts: PromptAnalysis[] = [];
        for (const promptText of session.prompts) {
            const individualAnalysis = await analyzePromptRisk(promptText);
            currentPrompts.push({ id: currentPrompts.length + 1, text: promptText, subnet: session.id, ...individualAnalysis });
        }
        processedData.push({
            features: extractFeatures(currentPrompts),
            label: session.groundTruth === 'Harmful' ? 1 : 0,
            session,
        });
        progressCallback((i + 1) / sessions.length * 50, `Analyzing prompts... (${i + 1}/${sessions.length})`);
    }

    // --- 2. Train/Test Split ---
    processedData.sort(() => Math.random() - 0.5); // Shuffle data
    const splitIndex = Math.floor(sessions.length * (1 - hyperparameters.testSplit));
    const trainSet = processedData.slice(0, splitIndex);
    const testSet = processedData.slice(splitIndex);

    // --- 3. Training with Gradient Descent ---
    let weights: ModelWeights = { sessionLength: 0, lastScore: 0, maxScore: 0, averageScore: 0, trend: 0, highRiskCount: 0, scoreVolatility: 0, intercept: 0 };
    const history: TrainingReport['history'] = [];
    const m = trainSet.length;
    const featureKeys = Object.keys(trainSet[0].features) as Features[];

    for (let epoch = 0; epoch < hyperparameters.epochs; epoch++) {
        let totalLoss = 0;
        const gradients: Record<keyof ModelWeights, number> = { sessionLength: 0, lastScore: 0, maxScore: 0, averageScore: 0, trend: 0, highRiskCount: 0, scoreVolatility: 0, intercept: 0 };

        for (const { features, label } of trainSet) {
            const logit = featureKeys.reduce((acc, key) => acc + features[key] * weights[key], weights.intercept);
            const prediction = sigmoid(logit);
            const error = prediction - label;
            
            // Avoid log(0)
            const loss = - (label * Math.log(prediction + 1e-9) + (1 - label) * Math.log(1 - prediction + 1e-9));
            totalLoss += loss;

            for (const key of featureKeys) {
                gradients[key] += features[key] * error;
            }
            gradients.intercept += error;
        }
        
        for (const key of (Object.keys(weights) as (keyof ModelWeights)[])) {
            weights[key] -= (hyperparameters.learningRate / m) * gradients[key];
        }

        history.push({ epoch, loss: totalLoss / m });
        progressCallback(50 + ((epoch + 1) / hyperparameters.epochs) * 50, `Training... (Epoch ${epoch + 1}/${hyperparameters.epochs})`);
    }

    // --- 4. Evaluate on Test Set ---
    const testSetResults: ValidationResultItem[] = [];
    for (const { features, session } of testSet) {
        // Use the new predictFromFeatures function for accurate evaluation
        const { sessionRiskScore, classification } = predictFromFeatures(features, weights);
        const simplifiedPrediction = classification === 'Safe' ? 'Safe' : 'Harmful';
        testSetResults.push({
            sessionId: session.id,
            prompts: session.prompts,
            groundTruth: session.groundTruth,
            prediction: classification,
            sessionRiskScore,
            isCorrect: simplifiedPrediction === session.groundTruth,
        });
    }

    const testSetMetrics = calculateMetrics(testSetResults);

    return {
        finalWeights: weights,
        history,
        testSetMetrics,
        testSetResults,
        trainingDatasetName: 'Custom Trained Model',
        testSetSize: testSet.length,
        trainingSetSize: trainSet.length,
        hyperparameters,
    };
}
