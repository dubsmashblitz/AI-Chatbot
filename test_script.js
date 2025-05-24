// --- Simple Test Runner ---
const testResultsList = document.getElementById('test-results');
const testSummaryDiv = document.getElementById('test-summary');
const testLogArea = document.getElementById('test-log-area');
let testsPassed = 0;
let testsFailed = 0;

function logTestMessage(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${type.toUpperCase()}] ${message}`;
    logEntry.style.color = type === 'error' ? 'red' : (type === 'warn' ? 'orange' : 'black');
    testLogArea.appendChild(logEntry);
}

function recordTestResult(description, success, details = '') {
    const listItem = document.createElement('li');
    listItem.textContent = description + ': ';
    const statusSpan = document.createElement('span');
    statusSpan.textContent = success ? 'PASS' : 'FAIL';
    statusSpan.className = success ? 'pass' : 'fail';
    listItem.appendChild(statusSpan);
    if (!success && details) {
        listItem.appendChild(document.createTextNode(` - ${details}`));
    }
    testResultsList.appendChild(listItem);
    if (success) testsPassed++;
    else testsFailed++;
}

function updateTestSummary() {
    testSummaryDiv.textContent = `Summary: ${testsPassed} passed, ${testsFailed} failed.`;
    if (testsFailed > 0) {
        testSummaryDiv.className = 'summary fail';
    } else {
        testSummaryDiv.className = 'summary pass';
    }
}

// --- Mocking ---
let mockFetchResponses = {};
const originalFetch = window.fetch; // Store original fetch

function mockFetch(url, options) {
    logTestMessage(`Mock Fetch called for URL: ${url}`);
    if (mockFetchResponses[url]) {
        const mockResponse = mockFetchResponses[url];
        if (mockResponse.error) {
            return Promise.reject(new Error(mockResponse.errorMessage || 'Mock Network Error'));
        }
        return Promise.resolve({
            ok: mockResponse.ok !== undefined ? mockResponse.ok : true,
            status: mockResponse.status || 200,
            statusText: mockResponse.statusText || 'OK',
            json: () => Promise.resolve(mockResponse.data),
            text: () => Promise.resolve(JSON.stringify(mockResponse.data)) // Add text() method
        });
    }
    logTestMessage(`No mock response defined for ${url}`, 'warn');
    return Promise.reject(new Error(`No mock response defined for ${url}`));
}

function setupMockFetch(url, data, ok = true, status = 200, error = false, errorMessage = 'Network Error') {
    mockFetchResponses[url] = { data, ok, status, error, errorMessage };
}

function resetMockFetch() {
    mockFetchResponses = {};
}

// --- DOM Elements (from test_runner.html) ---
const textInput = document.getElementById('text-input');
const checkTextButton = document.getElementById('check-text-button');
const checkPlagiarismButton = document.getElementById('check-plagiarism-button');
const checkAiTextButton = document.getElementById('check-ai-text-button');
const resultsContent = document.getElementById('results-content');
const readabilityResultsDiv = document.getElementById('readability-results');
const plagiarismResultsDiv = document.getElementById('plagiarism-results');
const aiTextResultsDiv = document.getElementById('ai-text-results');

// Helper to wait for async operations like fetch and subsequent DOM updates
async function wait(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Test Suites ---

async function testGrammarAndStyleCheck() {
    logTestMessage('--- Starting Grammar & Style Check Tests ---');
    textInput.value = '';
    resultsContent.innerHTML = '';
    readabilityResultsDiv.innerHTML = '';

    // Test 1: Empty input
    checkTextButton.click();
    await wait(); // Allow event listener and DOM updates to process
    recordTestResult('Grammar: Empty input shows error', resultsContent.innerHTML.includes('Please enter some text'));

    // Test 2: Successful API response for grammar
    textInput.value = 'This is a testt.';
    setupMockFetch('http://localhost:5000/api/checkText', {
        matches: [{ message: 'Spelling mistake', context: { text: 'testt', offset: 10, length: 5 }, shortMessage: 'Typo', replacements: [{value: 'test'}] }]
    });
    checkTextButton.click();
    await wait(100); // Longer wait for all async operations including readability
    recordTestResult('Grammar: Successful API response displays results', resultsContent.innerHTML.includes('Spelling mistake') && resultsContent.innerHTML.includes('highlighted-error'));
    recordTestResult('Grammar: Readability also runs', readabilityResultsDiv.innerHTML.includes('Readability Scores'));


    // Test 3: API error for grammar
    textInput.value = 'Error test.';
    setupMockFetch('http://localhost:5000/api/checkText', { error: 'API Error' }, false, 500, true, 'Internal Server Error');
    checkTextButton.click();
    await wait(100);
    recordTestResult('Grammar: API error displays error message', resultsContent.innerHTML.includes('Failed to check grammar'));
    recordTestResult('Grammar: Readability still runs on API error', readabilityResultsDiv.innerHTML.includes('Readability Scores'));


    // Test 4: Readability analysis populates correctly (covered partly by Test 2 and 3)
    textInput.value = 'This is a simple sentence. Another one follows.';
    checkTextButton.click(); // Uses existing mock or a new successful one if needed
    await wait(100);
    recordTestResult('Readability: Scores section is populated', readabilityResultsDiv.innerHTML.includes('Flesch Reading Ease'));
    recordTestResult('Readability: Style analysis section is populated', readabilityResultsDiv.innerHTML.includes('Sentence Count'));

    resetMockFetch();
    logTestMessage('--- Finished Grammar & Style Check Tests ---');
}

async function testPlagiarismCheck() {
    logTestMessage('--- Starting Plagiarism Check Tests ---');
    textInput.value = '';
    plagiarismResultsDiv.innerHTML = '';

    // Test 1: Empty input
    checkPlagiarismButton.click();
    await wait();
    recordTestResult('Plagiarism: Empty input shows error', plagiarismResultsDiv.innerHTML.includes('Please enter some text'));

    // Test 2: Successful API response
    textInput.value = 'Some text to check for plagiarism.';
    setupMockFetch('http://localhost:5000/api/checkPlagiarism', {
        status: 'potential_plagiarism', score: 0.85, details: 'High similarity with doc1', corpus_document_preview: 'Preview...'
    });
    checkPlagiarismButton.click();
    await wait();
    recordTestResult('Plagiarism: Successful API response displays results', plagiarismResultsDiv.innerHTML.includes('potential_plagiarism') && plagiarismResultsDiv.innerHTML.includes('85.0%'));

    // Test 3: API error
    textInput.value = 'Error test for plagiarism.';
    setupMockFetch('http://localhost:5000/api/checkPlagiarism', { error: 'API Error' }, false, 500, true);
    checkPlagiarismButton.click();
    await wait();
    recordTestResult('Plagiarism: API error displays error message', plagiarismResultsDiv.innerHTML.includes('Failed to check plagiarism'));
    
    resetMockFetch();
    logTestMessage('--- Finished Plagiarism Check Tests ---');
}

async function testAiTextCheck() {
    logTestMessage('--- Starting AI Text Check Tests ---');
    textInput.value = '';
    aiTextResultsDiv.innerHTML = '';

    // Test 1: Empty input
    checkAiTextButton.click();
    await wait();
    recordTestResult('AI Text: Empty input shows error', aiTextResultsDiv.innerHTML.includes('Please enter some text'));

    // Test 2: Successful API response (likely AI)
    textInput.value = 'This text sounds very robotic.';
    setupMockFetch('http://localhost:5000/api/checkAiText', {
        ai_score: 0.92, prediction_label: 'Fake', model_score: 0.92
    });
    checkAiTextButton.click();
    await wait();
    recordTestResult('AI Text: Successful API response (AI detected) displays results', aiTextResultsDiv.innerHTML.includes('92.0%') && aiTextResultsDiv.innerHTML.includes('Highly likely'));

    // Test 3: Successful API response (likely Human)
    textInput.value = 'This text is written by a human.';
    setupMockFetch('http://localhost:5000/api/checkAiText', {
        ai_score: 0.10, prediction_label: 'Real', model_score: 0.90
    });
    checkAiTextButton.click();
    await wait();
    recordTestResult('AI Text: Successful API response (Human detected) displays results', aiTextResultsDiv.innerHTML.includes('10.0%') && aiTextResultsDiv.innerHTML.includes('Likely human-written'));


    // Test 4: API error
    textInput.value = 'Error test for AI text.';
    setupMockFetch('http://localhost:5000/api/checkAiText', { error: 'API Error' }, false, 500, true);
    checkAiTextButton.click();
    await wait();
    recordTestResult('AI Text: API error displays error message', aiTextResultsDiv.innerHTML.includes('Failed to detect AI text'));
    
    resetMockFetch();
    logTestMessage('--- Finished AI Text Check Tests ---');
}


// --- Run all tests ---
async function runAllTests() {
    // Replace global fetch with mock
    window.fetch = mockFetch;

    await testGrammarAndStyleCheck();
    await testPlagiarismCheck();
    await testAiTextCheck();
    
    // Restore original fetch
    window.fetch = originalFetch;
    
    updateTestSummary();
    logTestMessage('All tests finished.', 'info');
}

// Run tests when the page loads
window.onload = runAllTests;
