# Advanced Text Checker Pro

## Project Overview

The "Advanced Text Checker Pro" is a comprehensive web application designed to help users improve their writing. It provides a suite of tools including grammar and spell checking, readability analysis, basic style suggestions, a proof-of-concept plagiarism checker against a local corpus, and a proof-of-concept AI-generated text detector. The application features a Python Flask backend and a dynamic JavaScript-driven frontend.

## Table of Contents

1.  [Features](#1-features)
2.  [Technology Stack](#2-technology-stack)
3.  [Prerequisites](#3-prerequisites)
4.  [Setup Instructions](#4-setup-instructions)
    *   [A. LanguageTool Server Setup](#a-languagetool-server-setup)
    *   [B. Python Backend API Setup](#b-python-backend-api-setup)
    *   [C. Frontend Application](#c-frontend-application)
5.  [Running the Full Application](#5-running-the-full-application)
6.  [Testing the Application](#6-testing-the-application)
    *   [A. Backend Tests](#a-backend-tests)
    *   [B. Frontend Tests](#b-frontend-tests)
7.  [Detailed Feature Explanations & Limitations](#7-detailed-feature-explanations--limitations)
    *   [A. Grammar and Spell Checking](#a-grammar-and-spell-checking)
    *   [B. Readability Analysis](#b-readability-analysis)
    *   [C. Basic Style Analysis](#c-basic-style-analysis)
    *   [D. Plagiarism Detection (Proof-of-Concept)](#d-plagiarism-detection-proof-of-concept)
    *   [E. AI-Generated Text Detection (Proof-of-Concept)](#e-ai-generated-text-detection-proof-of-concept)

## 1. Features

*   **Grammar and Spell Checking:** Integrates with LanguageTool for robust multilingual error detection.
*   **Readability Analysis:** Client-side calculation of various scores (Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog, etc.).
*   **Basic Style Analysis:** Client-side suggestions including sentence/word counts, long sentence identification, common adverb usage, basic passive voice detection, and complex word count.
*   **Plagiarism Detection (Proof-of-Concept):** Backend check against a small, predefined local corpus using TF-IDF and cosine similarity.
*   **AI-Generated Text Detection (Proof-of-Concept):** Backend integration with a Hugging Face model (`roberta-base-openai-detector`) to estimate the likelihood of text being AI-generated.
*   **Modern UI/UX:** Responsive design with a clean interface, animations, and distinct sections for different analysis results.

## 2. Technology Stack

*   **Backend:** Python, Flask
*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Grammar/Spelling Engine:** LanguageTool (self-hosted or via Docker)
*   **Plagiarism Detection Libraries:** NLTK, scikit-learn (for TF-IDF, cosine similarity)
*   **AI Text Detection Libraries:** Hugging Face Transformers, PyTorch
*   **Readability Analysis Library:** `text-statistics.js` (custom included as `readability.js`)
*   **Containerization (for LanguageTool):** Docker
*   **Testing:** Pytest, pytest-mock (backend); Plain JavaScript with HTML runner (frontend)

## 3. Prerequisites

To set up and run the "Advanced Text Checker Pro" application locally, you will need the following:

*   **Python:** Version 3.7 or higher.
*   **pip:** Python package installer (usually comes with Python).
*   **Java:** Version 8 or higher (for running LanguageTool manually if not using Docker).
*   **Docker:** (Optional, but recommended for LanguageTool setup) If you plan to run LanguageTool using Docker.
*   **Web Browser:** A modern web browser (e.g., Chrome, Firefox, Edge) to use the frontend application.
*   **Internet Connection:** Required for initial download of Python dependencies, NLTK data, and Hugging Face models.

## 4. Setup Instructions

### A. LanguageTool Server Setup

The backend API requires a running LanguageTool server.

**Option 1: Using Docker (Recommended)**
1.  **Build Docker Image:** A `Dockerfile` is provided. From the project root, run:
    ```bash
    docker build -t languagetool-server .
    ```
2.  **Run Docker Container:**
    ```bash
    docker run -d -p 8081:8081 languagetool-server
    ```
    The LanguageTool server will be accessible at `http://localhost:8081`.

**Option 2: Manual Setup**
1.  Download LanguageTool from `https://www.languagetool.org/download/` (e.g., `LanguageTool-stable.zip`).
2.  Unzip the archive.
3.  Navigate into the unzipped directory and start the server:
    ```bash
    java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081 --allow-origin "*"
    ```

### B. Python Backend API Setup

1.  **Navigate to Project Root:** Open your terminal in the project's root directory.
2.  **Create Virtual Environment (Recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On macOS/Linux
    # venv\Scripts\activate   # On Windows
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    This installs Flask, Requests, scikit-learn, NLTK, Transformers, Torch, Pytest, and Pytest-Mock.

4.  **Automatic Downloads (First Run):**
    *   **NLTK Data:** The first time `app.py` runs, it will attempt to download `punkt` (tokenizer) and `stopwords` data from NLTK for the plagiarism feature.
    *   **Hugging Face Model:** The AI text detection model (`roberta-base-openai-detector`) will also be downloaded (can be ~500MB) by the `transformers` library on first use/startup.
    An internet connection is required for these initial downloads.

### C. Frontend Application
No separate build steps are required for the frontend. It's served as static files (`index.html`, `style.css`, `script.js`, `readability.js`).

## 5. Running the Full Application

1.  **Start LanguageTool Server:** Ensure your LanguageTool server (Docker or manual) is running and accessible (typically at `http://localhost:8081`).
2.  **Start Backend API Server:**
    *   Activate your Python virtual environment (if you created one).
    *   From the project root, run:
        ```bash
        python app.py
        ```
    *   The backend server will start on `http://localhost:5000`. Wait for messages indicating that NLTK data and the AI model are ready (on first run) or loaded.
3.  **Open Frontend Application:**
    *   Open the `index.html` file in your web browser.
    *   You can now use all the features of the Advanced Text Checker Pro.

## 6. Testing the Application

### A. Backend Tests (`test_app.py`)
Backend tests use `pytest`. They mock external services and AI model inference.
1.  Ensure all dependencies from `requirements.txt` are installed in your virtual environment.
2.  From the project root, run:
    ```bash
    pytest -v test_app.py
    ```
    (You can add `-W ignore::DeprecationWarning --disable-pytest-warnings` for cleaner output).

### B. Frontend Tests (`test_script.js`)
Frontend tests use a simple HTML runner and mock `fetch` calls.
1.  Open `test_runner.html` in a web browser.
2.  Tests run automatically, and results are displayed on the page. No backend server is needed for these tests.

## 7. Detailed Feature Explanations & Limitations

### A. Grammar and Spell Checking
*   Utilizes an external LanguageTool server.
*   Provides suggestions, context for errors, and categorizes issues.

### B. Readability Analysis
*   Client-side analysis using `text-statistics.js` (as `readability.js`).
*   Scores provided: Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog, Coleman-Liau, SMOG, ARI.

### C. Basic Style Analysis
*   Client-side analysis.
*   Metrics: Sentence/word counts, average sentence length, long sentence identification, common adverb usage, basic passive voice detection, complex word count.

### D. Plagiarism Detection (Proof-of-Concept)
*   **Implementation:** Uses NLTK for text preprocessing (tokenization, stopword removal) and scikit-learn (TF-IDF, cosine similarity) in the Python backend.
*   **Functionality:** Compares the input text against a **small, predefined internal corpus** hardcoded in `app.py`. This is for demonstration only.
*   **Limitations:**
    *   **NOT an internet-wide check.** It only checks against its tiny internal sample document set.
    *   **Highly Corpus Dependent:** Effectiveness is entirely limited by the content and scope of this internal corpus.
    *   **Basic Preprocessing:** Does not use advanced techniques like stemming, lemmatization, or sophisticated paraphrasing detection.
    *   **Proof-of-Concept Only:** This feature is a very basic demonstration and not a production-ready plagiarism detection system.

### E. AI-Generated Text Detection (Proof-of-Concept)
*   **Model:** Uses `roberta-base-openai-detector` from Hugging Face Hub, developed by OpenAI.
*   **Implementation:** Integrated into the Python backend using the `transformers` library (with PyTorch). The model is loaded on app startup.
*   **Functionality:** Provides an estimated "AI Score" (likelihood of being AI-generated) based on the model's prediction.
*   **Critical Limitations:**
    *   **GPT-2 Specific:** This model was trained to detect output from the GPT-2 model. Its performance on text generated by newer, more advanced AI models (e.g., ChatGPT, GPT-3.5/4, Claude, Gemini, etc.) is **severely limited and likely unreliable.**
    *   **Not for Definitive Judgments:** This tool should **NOT** be used as the sole basis for any high-stakes decisions (e.g., academic integrity, hiring). It is a proof-of-concept with known limitations.
    *   **Accuracy:** The model is not 100% accurate. False positives (human text flagged as AI) and false negatives (AI text flagged as human) are possible and even likely with newer AI-generated texts.
    *   **Resource Intensive:** Transformer models are large (this one is ~500MB to download) and require significant memory and CPU for inference, which can make responses slower, especially for longer texts.
    *   **Proof-of-Concept Only:** This feature demonstrates integrating an open-source AI detection model. It is not a substitute for critical human judgment or more sophisticated detection tools.

---
*Advanced Text Checker Pro - Aiming for clearer, more effective writing.*
