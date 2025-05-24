from flask import Flask, request, jsonify
import requests
import os

# --- Plagiarism Detection Imports ---
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import string # For punctuation removal

# --- AI Text Detection Imports ---
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch # Explicitly import torch to ensure it's recognized

app = Flask(__name__)

LANGUAGETOOL_URL = os.environ.get("LANGUAGETOOL_URL", "http://localhost:8081/v2/check")

# --- NLTK Data Download ---
def download_nltk_data():
    try:
        nltk.data.find('tokenizers/punkt')
    except nltk.downloader.DownloadError:
        nltk.download('punkt', quiet=True)
    try:
        nltk.data.find('corpora/stopwords')
    except nltk.downloader.DownloadError:
        nltk.download('stopwords', quiet=True)

download_nltk_data()

# --- AI Text Detection Model Loading ---
AI_DETECTOR_MODEL_NAME = "roberta-base-openai-detector"
ai_text_detector = None
ai_detector_tokenizer = None
ai_detector_model = None

def load_ai_detector_model():
    global ai_text_detector, ai_detector_tokenizer, ai_detector_model
    if ai_text_detector is None:
        try:
            app.logger.info(f"Loading AI text detection model: {AI_DETECTOR_MODEL_NAME}...")
            # Using pipeline for simplicity as per original plan and model card
            ai_text_detector = pipeline("text-classification", model=AI_DETECTOR_MODEL_NAME)
            
            # Alternative: Load tokenizer and model separately if more control is needed
            # ai_detector_tokenizer = AutoTokenizer.from_pretrained(AI_DETECTOR_MODEL_NAME)
            # ai_detector_model = AutoModelForSequenceClassification.from_pretrained(AI_DETECTOR_MODEL_NAME)
            app.logger.info("AI text detection model loaded successfully.")
        except Exception as e:
            app.logger.error(f"Error loading AI text detection model '{AI_DETECTOR_MODEL_NAME}': {str(e)}")
            # The app can still run, but /api/checkAiText will fail gracefully.
            ai_text_detector = None 

load_ai_detector_model() # Load model on app startup


# --- Sample Corpus for Plagiarism Check ---
SAMPLE_CORPUS = {
    "doc1_histor_rome": "The Roman Empire was founded by Augustus in 27 BC. It spanned across Europe, North Africa, and the Middle East. Its fall in 476 AD marked the beginning of the Middle Ages in Western Europe. Rome's legacy includes its language, laws, architecture, and political institutions.",
    "doc2_python_intro": "Python is a versatile and widely-used programming language. Known for its readability and extensive libraries, it's popular in web development, data science, and artificial intelligence. Guido van Rossum began working on Python in the late 1980s.",
    "doc3_cooking_basics": "Cooking involves applying heat to food to transform its chemical and physical properties. Common methods include baking, frying, boiling, and grilling. Understanding basic techniques and ingredient combinations is key to successful cooking.",
    "doc4_space_exploration": "Space exploration began with the launch of Sputnik 1 in 1957. Key milestones include the Apollo Moon landing in 1969 and the operations of the International Space Station. Future goals involve missions to Mars and beyond."
}
CORPUS_DOC_IDS = list(SAMPLE_CORPUS.keys())
CORPUS_DOCUMENTS = list(SAMPLE_CORPUS.values())

def preprocess_text_for_plagiarism(text):
    tokens = nltk.word_tokenize(text.lower())
    tokens = [token for token in tokens if token not in string.punctuation]
    stop_words = nltk.corpus.stopwords.words('english')
    tokens = [token for token in tokens if token not in stop_words]
    return " ".join(tokens)

@app.route('/api/checkText', methods=['POST'])
def check_text():
    try:
        data = request.get_json()
        if not data: return jsonify({"error": "Invalid JSON payload"}), 400
        language = data.get('language')
        text_to_check = data.get('text')
        if not language or not text_to_check: return jsonify({"error": "Missing 'language' or 'text' field"}), 400
        
        payload = {'language': language, 'text': text_to_check}
        response = requests.post(LANGUAGETOOL_URL, data=payload)
        response.raise_for_status()
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error connecting to LanguageTool server: {str(e)}")
        return jsonify({"error": f"Error connecting to LanguageTool server: {str(e)}"}), 502
    except Exception as e:
        app.logger.error(f"Unexpected error in /api/checkText: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/checkPlagiarism', methods=['POST'])
def check_plagiarism():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Invalid JSON payload, missing 'text' field"}), 400
        input_text = data['text']
        if not input_text.strip():
            return jsonify({"status": "input_empty", "score": 0.0, "message": "Input text is empty."}), 200

        processed_input_text = preprocess_text_for_plagiarism(input_text)
        if not processed_input_text.strip():
             return jsonify({"status": "input_empty_after_processing", "score": 0.0, "message": "Input text contains only stopwords or punctuation."}), 200
        
        processed_corpus = [preprocess_text_for_plagiarism(doc) for doc in CORPUS_DOCUMENTS]
        valid_processed_corpus_indices = [i for i, doc in enumerate(processed_corpus) if doc.strip()]
        if not valid_processed_corpus_indices:
             return jsonify({"status": "corpus_empty_after_processing", "score": 0.0, "message": "Corpus documents are empty after preprocessing."}), 200
        
        vectorizer = TfidfVectorizer()
        corpus_vectors = vectorizer.fit_transform([processed_corpus[i] for i in valid_processed_corpus_indices])
        input_vector = vectorizer.transform([processed_input_text])
        similarity_scores = cosine_similarity(input_vector, corpus_vectors)
        
        highest_score = 0.0
        most_similar_doc_index = -1
        if similarity_scores.size > 0:
            highest_score = similarity_scores[0].max()
            most_similar_doc_index_in_filtered_corpus = similarity_scores[0].argmax()
            most_similar_doc_index = valid_processed_corpus_indices[most_similar_doc_index_in_filtered_corpus]

        PLAGIARISM_THRESHOLD = 0.7
        if highest_score >= PLAGIARISM_THRESHOLD:
            most_similar_doc_id = CORPUS_DOC_IDS[most_similar_doc_index]
            return jsonify({
                "status": "potential_plagiarism", "score": round(highest_score, 2),
                "details": f"High similarity with document: '{most_similar_doc_id}'.",
                "corpus_document_preview": SAMPLE_CORPUS[most_similar_doc_id][:200] + "..."
            }), 200
        else:
            details_message = "No significant similarity found with corpus documents."
            if most_similar_doc_index != -1:
                 most_similar_doc_id = CORPUS_DOC_IDS[most_similar_doc_index]
                 details_message = f"Highest similarity ({round(highest_score, 2)}) with document '{most_similar_doc_id}', but below threshold."
            return jsonify({"status": "no_significant_similarity", "score": round(highest_score, 2), "details": details_message}), 200
    except Exception as e:
        app.logger.error(f"Unexpected error in /api/checkPlagiarism: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "An unexpected error occurred during plagiarism check"}), 500

# --- AI Text Detection Endpoint ---
@app.route('/api/checkAiText', methods=['POST'])
def check_ai_text():
    global ai_text_detector
    if ai_text_detector is None:
        app.logger.error("AI text detection model is not loaded. Cannot process request.")
        return jsonify({"error": "AI text detection model is not available. Please check server logs."}), 503 # Service Unavailable

    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Invalid JSON payload, missing 'text' field"}), 400
        
        input_text = data['text']
        if not input_text.strip():
            return jsonify({"ai_score": 0.0, "prediction_label": "N/A", "model_score": 0.0, "message": "Input text is empty."}), 200

        # Truncate text if too long, as these models have input length limits
        # RoBERTa base typically has a 512 token limit.
        # A simple character-based truncation might be okay for a PoC.
        MAX_TEXT_LENGTH = 1000 # Heuristic character limit, actual token limit is different
        if len(input_text) > MAX_TEXT_LENGTH:
            input_text = input_text[:MAX_TEXT_LENGTH]
            app.logger.warning(f"Input text truncated to {MAX_TEXT_LENGTH} characters for AI detection.")

        # Perform detection
        # The pipeline returns a list of dicts, e.g., [{'label': 'Real', 'score': 0.9}] or [{'label': 'Fake', 'score': 0.1}]
        # For roberta-base-openai-detector: 'Real' means human, 'Fake' means AI (GPT-2)
        # The score indicates confidence in that label.
        model_output = ai_text_detector(input_text)
        
        if not model_output or not isinstance(model_output, list) or not model_output[0]:
            return jsonify({"error": "Invalid output from AI detection model"}), 500

        result = model_output[0]
        original_label = result.get('label')
        original_score = result.get('score')

        ai_score = 0.0
        # Interpretation: If label is 'Fake', then ai_score is its confidence.
        # If label is 'Real', then ai_score is (1 - its confidence).
        if original_label == 'Fake': # Or sometimes 'LABEL_1' for AI-generated
            ai_score = original_score
        elif original_label == 'LABEL_1': # Common Hugging Face convention for "positive" class (here, AI)
            ai_score = original_score
        elif original_label == 'Real': # Or sometimes 'LABEL_0' for human-written
            ai_score = 1.0 - original_score
        elif original_label == 'LABEL_0':
             ai_score = 1.0 - original_score
        else: # Fallback if labels are unexpected
            app.logger.warning(f"Unexpected label from AI model: {original_label}")
            # Cannot reliably determine ai_score if label is unknown
            return jsonify({
                "ai_score": "N/A",
                "prediction_label": original_label,
                "model_score": round(original_score, 3) if original_score is not None else "N/A",
                "message": "Model returned an unexpected label."
            }), 200


        return jsonify({
            "ai_score": round(ai_score, 3), # Probability of being AI-generated
            "prediction_label": original_label, # Original label from the model
            "model_score": round(original_score, 3) # Original score for that label
        }), 200

    except Exception as e:
        app.logger.error(f"Error during AI text detection: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "An unexpected error occurred during AI text detection"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # Important: Set use_reloader=False if model loading is expensive
    # to prevent it from loading twice in debug mode.
    app.run(debug=True, host='0.0.0.0', port=port, use_reloader=False)
