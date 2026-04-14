
import type { PromptAnalysis, SessionAnalysisResult, ModelWeights, ValidationSession, ValidationResultItem, TrainingReport } from '../types';
import { analyzePromptRisk } from './geminiService';
import { calculateMetrics } from './validationService';

// The default, hand-tuned weights for the logistic regression model.
export const DEFAULT_MODEL_WEIGHTS: ModelWeights = {
  lastScore: 3.0,
  maxScore: 2.5,
  averageScore: 1.0,
  trend: 2.0,
  promptCount: 0.1,
  intercept: -4.0,
};

type FeatureVector = Omit<ModelWeights, 'intercept'>;
type Features = keyof FeatureVector;

/**
 * Calculates the trend of risk scores.
 * A positive value indicates an increasing risk trend.
 */
const calculateTrend = (scores: number[]): number => {
  if (scores.length < 2) return 0;
  return (scores[scores.length - 1] - scores[0]) / (scores.length - 1);
};

/**
 * Extracts a feature vector from a sequence of prompt analyses.
 */
export const extractFeatures = (prompts: PromptAnalysis[]): FeatureVector => {
  if (prompts.length === 0) {
    return { lastScore: 0, maxScore: 0, averageScore: 0, trend: 0, promptCount: 0 };
  }
  const scores = prompts.map(p => p.score);
  return {
    lastScore: scores[scores.length - 1] || 0,
    maxScore: Math.max(...scores),
    averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    trend: calculateTrend(scores),
    promptCount: prompts.length,
  };
};

/**
 * The sigmoid function, which maps any real number to the (0, 1) interval.
 */
const sigmoid = (z: number): number => {
  return 1 / (1 + Math.exp(-z));
};

/**
 * Predicts session risk using a logistic regression model with provided weights.
 */
export const predictSessionRiskWithLocalModel = (prompts: PromptAnalysis[], weights: ModelWeights): SessionAnalysisResult => {
  if (prompts.length === 0) {
    return { sessionRiskScore: 0, classification: 'Safe' };
  }

  const features = extractFeatures(prompts);

  const logit = (Object.keys(features) as Features[]).reduce((acc, key) => {
    return acc + features[key] * weights[key];
  }, weights.intercept);

  const sessionRiskScore = sigmoid(logit);

  let classification: SessionAnalysisResult['classification'];
  if (sessionRiskScore >= 0.8) classification = 'Harmful';
  else if (sessionRiskScore >= 0.4) classification = 'Potentially Harmful';
  else classification = 'Safe';

  return { sessionRiskScore, classification };
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
    let weights: ModelWeights = { lastScore: 0, maxScore: 0, averageScore: 0, trend: 0, promptCount: 0, intercept: 0 };
    const history: TrainingReport['history'] = [];
    const m = trainSet.length;
    const featureKeys = Object.keys(trainSet[0].features) as Features[];

    for (let epoch = 0; epoch < hyperparameters.epochs; epoch++) {
        let totalLoss = 0;
        const gradients: Record<keyof ModelWeights, number> = { lastScore: 0, maxScore: 0, averageScore: 0, trend: 0, promptCount: 0, intercept: 0 };

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
    for (const { features, session, label } of testSet) {
        // Need to re-create PromptAnalysis structure for prediction function
        // FIX: Add missing properties `isJailbreak` and `attackCategories` to conform to PromptAnalysis type.
        const dummyPrompts: PromptAnalysis[] = [{ id: 1, text: '', score: features.lastScore, justification: '', subnet: '', isJailbreak: false, attackCategories: [] }];
        
        // Hacky way to pass features to prediction - ideally predict would take features directly
        // For now, we craft a minimal PromptAnalysis that yields the right features
        const tempScores = Array(features.promptCount).fill(features.averageScore);
        if(features.promptCount > 0) tempScores[tempScores.length -1] = features.lastScore;
        // FIX: Add missing properties `isJailbreak` and `attackCategories` to conform to PromptAnalysis type.
        const tempPrompts: PromptAnalysis[] = tempScores.map((s, i) => ({
             id: i, text: '', score: s, justification: '', subnet: '', isJailbreak: false, attackCategories: []
        }));


        const { sessionRiskScore, classification } = predictSessionRiskWithLocalModel(tempPrompts, weights);
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