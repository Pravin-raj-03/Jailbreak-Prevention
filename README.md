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

## Getting Started: Development Setup

Follow these steps to set up the project locally for development and contributions.

### Prerequisites

- Node.js (v18 or newer) and npm.
- A Google Gemini API key. You can get one from [Google AI Studio](https://ai.studio.google.com/app/apikey).

### Installation & Setup

1.  **Clone the Repository**:
    First, clone the project repository to your local machine.
    ```bash
    git clone https://github.com/pravinraj2006/jailbreak-prevention-system.git
    cd jailbreak-prevention-system
    ```

2.  **Install Dependencies**:
    This command reads the `package.json` file and installs all the necessary libraries and development tools.
    ```bash
    npm install
    ```

3.  **Configure API Key**:
    Create a new file named `.env` in the root of the project directory. This file will store your secret API key and will not be checked into Git. Add your Google Gemini API key to it like this:
    ```
    # .env file
    API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

4.  **Run the Development Server**:
    You're all set! Run the following command to start the application.
    ```bash
    npm run dev
    ```
    This will start the Vite development server, and you can view the running application in your browser at the local address provided (usually `http://localhost:5173`).

## Disclaimer

This is a proof-of-concept tool designed for educational and research purposes. The analysis provided should not be considered a substitute for a comprehensive security review. The models may produce inaccurate or inconsistent results.