# Jailbreak Prevention System

An advanced AI-powered system for real-time detection and analysis of multi-turn jailbreak attempts. This tool provides live session monitoring, multi-user threat intelligence, model validation, and custom model training capabilities to help identify and mitigate adversarial attacks on large language models.

## Key Features

- **Live Session Analysis**: Analyzes prompts in real-time within a session to detect escalating threats and sequential jailbreak attempts.
- **Multi-Layered Detection**: Utilizes both Gemini for sophisticated individual prompt analysis and a local logistic regression model for session-level risk assessment.
- **Multi-User Threat Intelligence**: Simulates and monitors activity from different user subnets to identify suspicious patterns and potential coordinated attacks.
- **Semantic Threat Graph**: Visualizes semantic relationships between prompts across different users and sessions to uncover hidden attack vectors.
- **Model Validation**: Includes a comprehensive dashboard to test the performance of the local risk model against various datasets, complete with metrics like ROC/AUC, precision-recall curves, and confusion matrices.
- **Custom Model Training**: Allows users to train the local logistic regression model on their own datasets to tailor its performance to specific threat models.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI/ML**: Google Gemini API (`gemini-2.5-flash`), Custom Logistic Regression Model
- **Charting**: Recharts
- **Build Tool**: Vite

## Getting Started

Follow these steps to run the application locally.

### Prerequisites

- Node.js and npm installed.
- A Google Gemini API key. You can get one from [Google AI Studio](https://ai.studio.google.com/app/apikey). You can provide multiple keys as a comma-separated list for automatic key rotation and rate-limiting resilience.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd jailbreak-prevention-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a file named `.env.local` in the root of the project and add your Gemini API key:
    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    # You can add multiple keys separated by commas
    # GEMINI_API_KEY="KEY_1,KEY_2,KEY_3"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Disclaimer

This is a proof-of-concept tool designed for educational and research purposes. The analysis provided should not be considered a substitute for a comprehensive security review. The models may produce inaccurate or inconsistent results.
