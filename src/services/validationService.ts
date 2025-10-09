import { analyzePromptRisk } from './geminiService';
import type { ValidationSession, ValidationResultItem, ValidationMetrics, PromptAnalysis, ConfusionMatrix, ROCPoint, PRPoint, ThresholdMetrics } from '../types';
import { predictSessionRiskWithLocalModel, DEFAULT_MODEL_WEIGHTS } from './riskModelService';

/**
 * Runs the validation process against a dataset.
 * @param dataset - The array of validation sessions to process.
 * @param progressCallback - A function to call with the current progress percentage.
 * @returns A promise that resolves to an array of detailed validation results.
 */
export async function runValidation(
  dataset: ValidationSession[],
  progressCallback: (progress: number, current: number, total: number) => void
): Promise<ValidationResultItem[]> {
  const allResults: ValidationResultItem[] = [];
  const totalSessions = dataset.length;

  for (let i = 0; i < totalSessions; i++) {
    const session = dataset[i];
    let currentPrompts: PromptAnalysis[] = [];
    
    // Create a history of prompts and their individual analyses, providing context for each step.
    for (const promptText of session.prompts) {
      // Pass the accumulating history of prompts within the session for context-aware analysis
      const individualAnalysis = await analyzePromptRisk(promptText, currentPrompts);
      currentPrompts.push({
        id: currentPrompts.length + 1,
        text: promptText,
        subnet: session.id, // Use session ID for subnet in validation context
        ...individualAnalysis,
      });
    }

    const sessionResult = predictSessionRiskWithLocalModel(currentPrompts, DEFAULT_MODEL_WEIGHTS);
    const prediction = sessionResult.classification;
    // Potentially Harmful is considered Harmful for binary classification
    const simplifiedPrediction = prediction === 'Safe' ? 'Safe' : 'Harmful';
    const isCorrect = simplifiedPrediction === session.groundTruth;

    allResults.push({
      sessionId: session.id,
      prompts: session.prompts,
      groundTruth: session.groundTruth,
      prediction,
      sessionRiskScore: sessionResult.sessionRiskScore,
      isCorrect,
    });

    // Update progress
    progressCallback(((i + 1) / totalSessions) * 100, i + 1, totalSessions);
  }

  return allResults;
}


/**
 * Calculates detailed performance metrics for a specific classification threshold.
 */
export const calculateMetricsForThreshold = (results: ValidationResultItem[], threshold: number): ThresholdMetrics => {
  let tp = 0, tn = 0, fp = 0, fn = 0;

  results.forEach(res => {
    const predictionIsHarmful = res.sessionRiskScore >= threshold;
    const groundTruthIsHarmful = res.groundTruth === 'Harmful';

    if (predictionIsHarmful && groundTruthIsHarmful) tp++;
    else if (!predictionIsHarmful && !groundTruthIsHarmful) tn++;
    else if (predictionIsHarmful && !groundTruthIsHarmful) fp++;
    else if (!predictionIsHarmful && groundTruthIsHarmful) fn++;
  });

  const confusionMatrix: ConfusionMatrix = { truePositive: tp, trueNegative: tn, falsePositive: fp, falseNegative: fn };
  
  const safeSupport = tn + fp;
  const harmfulSupport = tp + fn;

  const safePrecision = tn + fn === 0 ? 0 : tn / (tn + fn);
  const safeRecall = tn + fp === 0 ? 0 : tn / (tn + fp);
  const safeF1Score = 2 * (safePrecision * safeRecall) / (safePrecision + safeRecall) || 0;

  const harmfulPrecision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const harmfulRecall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const harmfulF1Score = 2 * (harmfulPrecision * harmfulRecall) / (harmfulPrecision * harmfulRecall) || 0;
  
  const accuracy = (tp + tn + fp + fn) === 0 ? 0 : (tp + tn) / (tp + tn + fp + fn);
  const specificity = (tn + fp) === 0 ? 0 : tn / (tn + fp);

  const mccNumerator = (tp * tn - fp * fn);
  const mccDenominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const mcc = mccDenominator === 0 ? 0 : mccNumerator / mccDenominator;

  return {
    accuracy,
    precision: harmfulPrecision, // Macro-average for the positive class 'Harmful'
    recall: harmfulRecall,       // Macro-average for the positive class 'Harmful'
    f1Score: harmfulF1Score,     // Macro-average for the positive class 'Harmful'
    specificity,                 // True Negative Rate
    mcc,                         // Matthews Correlation Coefficient
    confusionMatrix,
    perClassMetrics: {
        Safe: { precision: safePrecision, recall: safeRecall, f1Score: safeF1Score, support: safeSupport },
        Harmful: { precision: harmfulPrecision, recall: harmfulRecall, f1Score: harmfulF1Score, support: harmfulSupport }
    }
  };
};

/**
 * Calculates a full validation report, including ROC/PR curves and metrics at a default 0.5 threshold.
 */
export const calculateMetrics = (results: ValidationResultItem[]): ValidationMetrics => {
  const rocCurve: ROCPoint[] = [];
  const prCurve: PRPoint[] = [];
  
  // Create a sorted list of unique scores to use as thresholds
  const uniqueScores = [...new Set(results.map(r => r.sessionRiskScore))].sort((a,b) => b-a);
  const thresholds = [1.0, ...uniqueScores, 0.0];

  for (const threshold of thresholds) {
    const metrics = calculateMetricsForThreshold(results, threshold);
    const tpr = metrics.recall; // Recall for 'Harmful' class (TPR)
    const fpr = 1 - metrics.specificity;
    const precision = metrics.precision;
    const recall = tpr;
    
    rocCurve.push({ fpr, tpr });
    // Add point to PR curve if it's not a duplicate of the last one
    if (prCurve.length === 0 || prCurve[prCurve.length - 1].recall !== recall || prCurve[prCurve.length - 1].precision !== precision) {
        prCurve.push({ precision, recall });
    }
  }

  // Ensure ROC curve is monotonic and properly formatted
  const cleanedRoc = rocCurve.filter((val, index, self) => index === self.findIndex(t => t.fpr === val.fpr && t.tpr === val.tpr));
  cleanedRoc.sort((a,b) => a.fpr - b.fpr);


  // Calculate AUC (Area Under ROC Curve) using trapezoidal rule
  let auc = 0;
  for (let i = 1; i < cleanedRoc.length; i++) {
    auc += (cleanedRoc[i].fpr - cleanedRoc[i-1].fpr) * (cleanedRoc[i].tpr + cleanedRoc[i-1].tpr) / 2;
  }
  
  // Get metrics for the default 0.5 threshold
  const defaultMetrics = calculateMetricsForThreshold(results, 0.5);

  return {
    ...defaultMetrics,
    rocCurve: cleanedRoc,
    auc,
    prCurve,
  };
};