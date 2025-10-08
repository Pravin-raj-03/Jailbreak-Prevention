import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function initializeGemini(apiKey: string) {
    if (!apiKey) {
        console.error("Cannot initialize Gemini: API key is required.");
        aiInstance = null;
        return;
    }
    aiInstance = new GoogleGenAI({ apiKey });
}

export function getGeminiInstance(): GoogleGenAI {
    if (!aiInstance) {
        throw new Error("Gemini has not been initialized. Please wrap your application in a JPSProvider and provide a valid apiKey.");
    }
    return aiInstance;
}
