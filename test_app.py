import pytest
import json
from app import app as flask_app # Import the Flask app instance
from unittest.mock import MagicMock

# --- Fixtures ---
@pytest.fixture
def app_instance():
    """Create and configure a new app instance for each test."""
    # Ensure the app is configured for testing
    flask_app.config.update({
        "TESTING": True,
    })
    # Any other setup, like initializing NLTK data or AI model mocks if needed globally
    # For now, we assume NLTK data is handled by app.py and AI model is mocked per test
    return flask_app

@pytest.fixture
def client(app_instance):
    """A test client for the app."""
    return app_instance.test_client()

# --- Tests for /api/checkText ---

def test_check_text_success(client, mocker):
    """Test /api/checkText with valid input and mocked successful LanguageTool response."""
    mock_lt_response = MagicMock()
    mock_lt_response.status_code = 200
    mock_lt_response.json.return_value = {"matches": [{"message": "Test error"}]}
    mocker.patch("requests.post", return_value=mock_lt_response)

    response = client.post('/api/checkText', json={"language": "en-US", "text": "This is a tst."})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "matches" in data
    assert data["matches"][0]["message"] == "Test error"

def test_check_text_missing_fields(client):
    """Test /api/checkText with missing 'text' or 'language' fields."""
    response = client.post('/api/checkText', json={"language": "en-US"}) # Missing text
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data

    response = client.post('/api/checkText', json={"text": "Test"}) # Missing language
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
    
    response = client.post('/api/checkText', json={}) # Empty payload
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data

def test_check_text_languagetool_service_unavailable(client, mocker):
    """Test /api/checkText when LanguageTool service is unavailable."""
    mocker.patch("requests.post", side_effect=requests.exceptions.RequestException("Service down"))
    response = client.post('/api/checkText', json={"language": "en-US", "text": "Test"})
    assert response.status_code == 502 # Bad Gateway
    data = json.loads(response.data)
    assert "error" in data
    assert "Error connecting to LanguageTool server" in data["error"]

def test_check_text_languagetool_returns_error(client, mocker):
    """Test /api/checkText when LanguageTool returns a non-200 status."""
    mock_lt_response = MagicMock()
    mock_lt_response.status_code = 500
    mock_lt_response.raise_for_status.side_effect = requests.exceptions.HTTPError("LT Internal Error")
    # If raise_for_status is called, json() might not be.
    # Let's assume it still tries to get JSON if error is structured
    mock_lt_response.json.return_value = {"error": "LT internal error"}
    
    mocker.patch("requests.post", return_value=mock_lt_response)
    
    response = client.post('/api/checkText', json={"language": "en-US", "text": "Test"})
    # This should be caught by response.raise_for_status() in app.py
    assert response.status_code == 502 
    data = json.loads(response.data)
    assert "error" in data

# --- Tests for /api/checkPlagiarism ---

def test_check_plagiarism_potential(client):
    """Test /api/checkPlagiarism with text highly similar to corpus."""
    # This text is very similar to SAMPLE_CORPUS["doc2_python_intro"]
    test_text = "Python is a versatile and widely used programming language, great for web dev and data science."
    response = client.post('/api/checkPlagiarism', json={"text": test_text})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "potential_plagiarism"
    assert data["score"] > 0.7  # Expect high score
    assert "doc2_python_intro" in data["details"]

def test_check_plagiarism_no_similarity(client):
    """Test /api/checkPlagiarism with unique text."""
    test_text = "This is a completely unique sentence with no resemblance to the corpus documents about dinosaurs and quantum physics."
    response = client.post('/api/checkPlagiarism', json={"text": test_text})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "no_significant_similarity"
    assert data["score"] < 0.5 # Expect low score

def test_check_plagiarism_empty_input(client):
    """Test /api/checkPlagiarism with empty text."""
    response = client.post('/api/checkPlagiarism', json={"text": "  "})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "input_empty"

def test_check_plagiarism_empty_after_processing(client):
    """Test /api/checkPlagiarism with text that becomes empty after preprocessing."""
    response = client.post('/api/checkPlagiarism', json={"text": ". , ! ? the a is of"})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["status"] == "input_empty_after_processing"


def test_check_plagiarism_missing_text_field(client):
    """Test /api/checkPlagiarism with missing 'text' field."""
    response = client.post('/api/checkPlagiarism', json={})
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data

# --- Tests for /api/checkAiText ---

@pytest.fixture
def mock_ai_detector(mocker):
    """Fixture to mock the AI text detector pipeline."""
    mock_pipeline = MagicMock()
    # Patch the global ai_text_detector in the app module
    mocker.patch("app.ai_text_detector", mock_pipeline)
    return mock_pipeline

def test_check_ai_text_detected_as_fake(client, mock_ai_detector):
    """Test /api/checkAiText when model predicts 'Fake'."""
    mock_ai_detector.return_value = [{'label': 'Fake', 'score': 0.95}]
    response = client.post('/api/checkAiText', json={"text": "This text is AI generated."})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["prediction_label"] == "Fake"
    assert data["model_score"] == 0.95
    assert data["ai_score"] == 0.95 # If Fake, ai_score is model_score

def test_check_ai_text_detected_as_real(client, mock_ai_detector):
    """Test /api/checkAiText when model predicts 'Real'."""
    mock_ai_detector.return_value = [{'label': 'Real', 'score': 0.88}]
    response = client.post('/api/checkAiText', json={"text": "This text is human written."})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["prediction_label"] == "Real"
    assert data["model_score"] == 0.88
    assert pytest.approx(data["ai_score"]) == 1.0 - 0.88

def test_check_ai_text_label_1(client, mock_ai_detector):
    """Test /api/checkAiText when model predicts 'LABEL_1' (convention for AI)."""
    mock_ai_detector.return_value = [{'label': 'LABEL_1', 'score': 0.92}]
    response = client.post('/api/checkAiText', json={"text": "AI text here."})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["prediction_label"] == "LABEL_1"
    assert data["model_score"] == 0.92
    assert data["ai_score"] == 0.92

def test_check_ai_text_label_0(client, mock_ai_detector):
    """Test /api/checkAiText when model predicts 'LABEL_0' (convention for Human)."""
    mock_ai_detector.return_value = [{'label': 'LABEL_0', 'score': 0.85}]
    response = client.post('/api/checkAiText', json={"text": "Human text here."})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["prediction_label"] == "LABEL_0"
    assert data["model_score"] == 0.85
    assert pytest.approx(data["ai_score"]) == 1.0 - 0.85


def test_check_ai_text_empty_input(client, mock_ai_detector):
    """Test /api/checkAiText with empty text."""
    response = client.post('/api/checkAiText', json={"text": "  "})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["message"] == "Input text is empty."
    assert data["ai_score"] == 0.0
    # mock_ai_detector should not have been called
    mock_ai_detector.assert_not_called()


def test_check_ai_text_missing_text_field(client):
    """Test /api/checkAiText with missing 'text' field."""
    response = client.post('/api/checkAiText', json={})
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data

def test_check_ai_text_model_not_loaded(client, mocker):
    """Test /api/checkAiText when AI model failed to load."""
    mocker.patch("app.ai_text_detector", None) # Simulate model not loaded
    response = client.post('/api/checkAiText', json={"text": "Some text"})
    assert response.status_code == 503 # Service Unavailable
    data = json.loads(response.data)
    assert "AI text detection model is not available" in data["error"]

def test_check_ai_text_model_inference_fails(client, mock_ai_detector):
    """Test /api/checkAiText when AI model inference raises an exception."""
    mock_ai_detector.side_effect = Exception("Model inference error")
    response = client.post('/api/checkAiText', json={"text": "Some text"})
    assert response.status_code == 500
    data = json.loads(response.data)
    assert "An unexpected error occurred during AI text detection" in data["error"]

def test_check_ai_text_model_unexpected_output(client, mock_ai_detector):
    """Test /api/checkAiText when AI model returns unexpected output structure."""
    mock_ai_detector.return_value = [{"wrong_key": "wrong_value"}] # Missing 'label' or 'score'
    response = client.post('/api/checkAiText', json={"text": "Some text"})
    assert response.status_code == 200 # Handled as an unexpected label case
    data = json.loads(response.data)
    assert data["ai_score"] == "N/A"
    assert "Model returned an unexpected label" in data["message"]

    mock_ai_detector.return_value = [] # Empty list
    response = client.post('/api/checkAiText', json={"text": "Some text"})
    assert response.status_code == 500 
    data = json.loads(response.data)
    assert "Invalid output from AI detection model" in data["error"]

# --- Basic NLTK data download test (does not verify download, just that function runs) ---
def test_download_nltk_data_runs(mocker):
    """Test that download_nltk_data runs without error (mocks actual download)."""
    mocker.patch("nltk.download")
    from app import download_nltk_data
    try:
        download_nltk_data()
    except Exception as e:
        pytest.fail(f"download_nltk_data raised an exception: {e}")

# --- Test text preprocessing for plagiarism ---
def test_preprocess_text_for_plagiarism():
    from app import preprocess_text_for_plagiarism
    text = "This is a Sample Text with punctuation, and some Stopwords like the, a, is."
    expected = "sample text punctuation stopwords like" # Order might vary slightly if stemming was used
    # With current simple join, order is fixed.
    assert preprocess_text_for_plagiarism(text) == expected

    text_only_stopwords = "the a is of for and"
    expected_empty = ""
    assert preprocess_text_for_plagiarism(text_only_stopwords) == expected_empty
