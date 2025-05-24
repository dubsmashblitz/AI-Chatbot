document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const checkTextButton = document.getElementById('check-text-button');
    const checkPlagiarismButton = document.getElementById('check-plagiarism-button');
    const checkAiTextButton = document.getElementById('check-ai-text-button'); 
    
    const resultsContent = document.getElementById('results-content');
    const readabilityResultsDiv = document.getElementById('readability-results');
    const plagiarismResultsDiv = document.getElementById('plagiarism-results');
    const aiTextResultsDiv = document.getElementById('ai-text-results'); 
    
    const languageSelect = document.getElementById('language-select');

    // Combined Grammar, Readability, and Style Check
    checkTextButton.addEventListener('click', async () => {
        const textToCheck = textInput.value;
        const selectedLanguage = languageSelect.value;

        // Clear previous results by making the result boxes empty
        resultsContent.innerHTML = ''; 
        readabilityResultsDiv.innerHTML = '';
        plagiarismResultsDiv.innerHTML = ''; 
        aiTextResultsDiv.innerHTML = ''; 

        if (textToCheck.trim() === '') {
            resultsContent.innerHTML = '<p class="error-message">Please enter some text to check.</p>';
            return;
        }

        resultsContent.innerHTML = '<p class="loading-message spinner">Checking grammar & spelling...</p>';
        readabilityResultsDiv.innerHTML = '<p class="loading-message spinner">Analyzing readability & style...</p>';

        // Grammar and Spelling Check (API call)
        try {
            const response = await fetch('http://localhost:5000/api/checkText', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: selectedLanguage, text: textToCheck }),
            });

            if (!response.ok) {
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
                resultsContent.innerHTML = `<p class="error-message">Failed to check grammar. Server responded with: ${errorMsg}</p>`;
            } else {
                const data = await response.json();
                displayGrammarResults(data);
            }
        } catch (error) {
            console.error('Grammar check error:', error);
            resultsContent.innerHTML = '<p class="error-message">Network error or unable to connect for grammar check.</p>';
        }

        // Readability and Style Analysis (Client-side)
        analyzeReadabilityAndStyle(textToCheck); // This will clear its own loading message
    });

    // Plagiarism Check
    checkPlagiarismButton.addEventListener('click', async () => {
        const textToCheck = textInput.value;
        plagiarismResultsDiv.innerHTML = ''; 

        if (textToCheck.trim() === '') {
            plagiarismResultsDiv.innerHTML = '<p class="error-message">Please enter some text to check for plagiarism.</p>';
            return;
        }
        plagiarismResultsDiv.innerHTML = '<p class="loading-message spinner">Checking for plagiarism...</p>';
        try {
            const response = await fetch('http://localhost:5000/api/checkPlagiarism', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToCheck }),
            });
            if (!response.ok) {
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
                plagiarismResultsDiv.innerHTML = `<p class="error-message">Failed to check plagiarism. Server responded with: ${errorMsg}</p>`;
            } else {
                const data = await response.json();
                displayPlagiarismResults(data);
            }
        } catch (error) {
            console.error('Plagiarism check error:', error);
            plagiarismResultsDiv.innerHTML = '<p class="error-message">Network error or unable to connect for plagiarism check.</p>';
        }
    });

    // AI Text Detection Check
    checkAiTextButton.addEventListener('click', async () => {
        const textToCheck = textInput.value;
        aiTextResultsDiv.innerHTML = ''; 

        if (textToCheck.trim() === '') {
            aiTextResultsDiv.innerHTML = '<p class="error-message">Please enter some text to check for AI generation.</p>';
            return;
        }
        aiTextResultsDiv.innerHTML = '<p class="loading-message spinner">Detecting AI-generated text...</p>';
        try {
            const response = await fetch('http://localhost:5000/api/checkAiText', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToCheck }),
            });

            if (!response.ok) {
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
                aiTextResultsDiv.innerHTML = `<p class="error-message">Failed to detect AI text. Server responded with: ${errorMsg}</p>`;
            } else {
                const data = await response.json();
                displayAiTextResults(data);
            }
        } catch (error) {
            console.error('AI text detection error:', error);
            aiTextResultsDiv.innerHTML = '<p class="error-message">Network error or unable to connect for AI text detection.</p>';
        }
    });


    function displayGrammarResults(data) {
        resultsContent.innerHTML = ''; 
        if (data.error) {
            resultsContent.innerHTML = `<p class="error-message">Grammar Check Backend Error: ${data.error}</p>`;
            return;
        }
        if (!data.matches || data.matches.length === 0) {
            resultsContent.innerHTML = '<p class="success-message">No grammar or spelling issues found!</p>';
            return;
        }
        // Ensure this section has an H3 title if content is added
        resultsContent.innerHTML = '<h3>Grammar & Spelling Issues:</h3>';
        const resultList = document.createElement('ul');
        resultList.className = 'result-list';
        data.matches.forEach(match => {
            const listItem = document.createElement('li');
            listItem.className = 'result-item';
            const message = document.createElement('p');
            message.className = 'match-message';
            message.textContent = match.message;
            listItem.appendChild(message);
            if (match.context && match.context.text) {
                const contextText = match.context.text;
                const errorOffsetInContext = match.context.offset;
                const errorLength = match.context.length;
                const contextPara = document.createElement('p');
                contextPara.className = 'match-context';
                const preText = document.createTextNode(contextText.substring(0, errorOffsetInContext));
                const highlightedText = document.createElement('span');
                highlightedText.className = 'highlighted-error';
                highlightedText.textContent = contextText.substring(errorOffsetInContext, errorOffsetInContext + errorLength);
                const postText = document.createTextNode(contextText.substring(errorOffsetInContext + errorLength));
                contextPara.appendChild(preText);
                contextPara.appendChild(highlightedText);
                contextPara.appendChild(postText);
                listItem.appendChild(contextPara);
            }
            if (match.shortMessage) {
                const shortMsgPara = document.createElement('p');
                shortMsgPara.className = 'match-short-message';
                let categoryName = match.shortMessage;
                if (match.rule && match.rule.category && match.rule.category.name && match.shortMessage.toLowerCase().includes("mistake")) {
                    categoryName = match.rule.category.name;
                }
                shortMsgPara.textContent = `Category: ${categoryName}`;
                listItem.appendChild(shortMsgPara);
            }
            if (match.replacements && match.replacements.length > 0) {
                const replacementsPara = document.createElement('p');
                replacementsPara.className = 'match-replacements';
                replacementsPara.innerHTML = 'Suggestions: ';
                match.replacements.forEach((replacement, index) => {
                    const suggestionSpan = document.createElement('span');
                    suggestionSpan.className = 'suggestion';
                    suggestionSpan.textContent = replacement.value;
                    replacementsPara.appendChild(suggestionSpan);
                    if (index < match.replacements.length - 1) {
                        replacementsPara.append(', ');
                    }
                });
                listItem.appendChild(replacementsPara);
            }
            resultList.appendChild(listItem);
        });
        resultsContent.appendChild(resultList);
    }

    function analyzeReadabilityAndStyle(text) {
        readabilityResultsDiv.innerHTML = ''; // Clear its own loading message first
        if (!text || typeof textstatistics === 'undefined') {
            readabilityResultsDiv.innerHTML = '<p class="error-message">Readability analysis could not be performed (library not loaded).</p>';
            return;
        }
        
        const stats = textstatistics(text);
        const scoresSection = document.createElement('div');
        scoresSection.innerHTML = '<h3>Readability Scores:</h3>';
        const scoresList = document.createElement('ul');
        scoresList.className = 'readability-score-list';
        const scores = {
            "Flesch Reading Ease": stats.fleschKincaidReadingEase(),
            "Flesch-Kincaid Grade Level": stats.fleschKincaidGradeLevel(),
            "Gunning Fog Score": stats.gunningFogScore(),
            "Coleman-Liau Index": stats.colemanLiauIndex(),
            "SMOG Index": stats.smogIndex(),
            "Automated Readability Index (ARI)": stats.automatedReadabilityIndex(),
        };
        for (const [key, value] of Object.entries(scores)) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>${key}:</strong> ${value}`;
            scoresList.appendChild(listItem);
        }
        scoresSection.appendChild(scoresList);
        readabilityResultsDiv.appendChild(scoresSection);

        const styleSection = document.createElement('div');
        styleSection.innerHTML = '<h3>Style Analysis:</h3>';
        const styleList = document.createElement('ul');
        styleList.className = 'style-analysis-list';
        const sentenceCount = stats.sentenceCount();
        const wordCount = stats.wordCount();
        const avgWordsPerSentence = (wordCount > 0 && sentenceCount > 0) ? (wordCount / sentenceCount).toFixed(2) : "N/A";
        styleList.innerHTML += `<li><strong>Sentence Count:</strong> ${sentenceCount}</li>`;
        styleList.innerHTML += `<li><strong>Word Count:</strong> ${wordCount}</li>`;
        styleList.innerHTML += `<li><strong>Average Words per Sentence:</strong> ${avgWordsPerSentence}</li>`;
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);
        if (longSentences.length > 0) {
            const longSentencesLi = document.createElement('li');
            longSentencesLi.innerHTML = `<strong>Long Sentences (${longSentences.length} found, >25 words):</strong>`;
            const longSentencesUl = document.createElement('ul');
            longSentences.forEach(s => {
                const item = document.createElement('li');
                item.className = 'long-sentence-item';
                item.textContent = s.substring(0, 100) + (s.length > 100 ? '...' : '');
                longSentencesUl.appendChild(item);
            });
            longSentencesLi.appendChild(longSentencesUl);
            styleList.appendChild(longSentencesLi);
        }
        const commonAdverbs = ['very', 'really', 'quickly', 'actually', 'probably', 'usually', 'often', 'always', 'never', 'just', 'simply', 'quite', 'rather'];
        const adverbCounts = {};
        let totalAdverbsFound = 0;
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        words.forEach(word => {
            if (commonAdverbs.includes(word)) {
                adverbCounts[word] = (adverbCounts[word] || 0) + 1;
                totalAdverbsFound++;
            }
        });
        if (totalAdverbsFound > 0) {
            const adverbsLi = document.createElement('li');
            adverbsLi.innerHTML = `<strong>Common Adverbs Detected (${totalAdverbsFound} total):</strong>`;
            const adverbsUl = document.createElement('ul');
            for (const [adverb, count] of Object.entries(adverbCounts)) {
                const item = document.createElement('li');
                item.textContent = `${adverb}: ${count}`;
                adverbsUl.appendChild(item);
            }
            adverbsLi.appendChild(adverbsUl);
            styleList.appendChild(adverbsLi);
        }
        const passiveRegex = /\b(is|are|was|were|be|been|being)\s+([a-zA-Z]+ed|[a-zA-Z]+en)\b/gi;
        const passiveSentences = sentences.filter(s => passiveRegex.test(s));
        if (passiveSentences.length > 0) {
            const passiveLi = document.createElement('li');
            passiveLi.innerHTML = `<strong>Potential Passive Voice (${passiveSentences.length} sentences):</strong>`;
            const passiveUl = document.createElement('ul');
            passiveSentences.forEach(s => {
                const item = document.createElement('li');
                item.className = 'passive-sentence-item';
                item.textContent = s.substring(0, 100) + (s.length > 100 ? '...' : '');
                passiveUl.appendChild(item);
            });
            passiveLi.appendChild(passiveUl);
            styleList.appendChild(passiveLi);
        }
        const complexWordCount = stats.wordsWithThreeSyllables(text, false);
        styleList.innerHTML += `<li><strong>Complex Words (>=3 syllables):</strong> ${complexWordCount}</li>`;
        styleSection.appendChild(styleList);
        readabilityResultsDiv.appendChild(styleSection);
    }

    function displayPlagiarismResults(data) {
        plagiarismResultsDiv.innerHTML = ''; 
        // Ensure this section has an H3 title if content is added
        plagiarismResultsDiv.innerHTML = '<h3>Plagiarism Check:</h3>';
        const resultContainer = document.createElement('div');
        resultContainer.className = 'plagiarism-result-item';
        const statusPara = document.createElement('p');
        statusPara.innerHTML = `<strong>Status:</strong> ${data.status.replace(/_/g, ' ')}`;
        resultContainer.appendChild(statusPara);
        const scorePara = document.createElement('p');
        scorePara.innerHTML = `<strong>Similarity Score:</strong> ${(data.score * 100).toFixed(1)}%`;
        resultContainer.appendChild(scorePara);
        if (data.details) {
            const detailsPara = document.createElement('p');
            detailsPara.innerHTML = `<strong>Details:</strong> ${data.details}`;
            resultContainer.appendChild(detailsPara);
        }
        if (data.corpus_document_preview) {
            const previewTitle = document.createElement('p');
            previewTitle.innerHTML = '<strong>Preview of Most Similar Corpus Document:</strong>';
            resultContainer.appendChild(previewTitle);
            const previewContent = document.createElement('blockquote');
            previewContent.className = 'corpus-preview';
            previewContent.textContent = data.corpus_document_preview;
            resultContainer.appendChild(previewContent);
        }
        if (data.status === "potential_plagiarism") {
            resultContainer.classList.add("plagiarism-warning");
        } else if (data.status === "no_significant_similarity" || data.status === "input_empty" || data.status === "input_empty_after_processing") {
             resultContainer.classList.add("plagiarism-ok");
        }
        plagiarismResultsDiv.appendChild(resultContainer);
    }

    function displayAiTextResults(data) {
        aiTextResultsDiv.innerHTML = ''; 
         // Ensure this section has an H3 title if content is added
        aiTextResultsDiv.innerHTML = '<h3>AI-Generated Text Detection:</h3>';

        if (data.error) {
            aiTextResultsDiv.innerHTML += `<p class="error-message">AI Detection Error: ${data.error}</p>`; // Append to H3
            return;
        }
        if (data.message && data.ai_score === 0.0) { 
             aiTextResultsDiv.innerHTML += `<p class="info-message">${data.message}</p>`; // Append to H3
            return;
        }

        const resultContainer = document.createElement('div');
        resultContainer.className = 'ai-text-result-item';

        const score = data.ai_score;
        let interpretation = "Undetermined";
        let scoreClass = "ai-score-neutral";

        if (score === "N/A") {
            interpretation = data.message || "Could not reliably determine AI score due to unexpected model output.";
        } else if (score > 0.75) {
            interpretation = "Highly likely to be AI-generated.";
            scoreClass = "ai-score-high";
        } else if (score > 0.5) {
            interpretation = "Possibly AI-generated.";
            scoreClass = "ai-score-medium";
        } else {
            interpretation = "Likely human-written.";
            scoreClass = "ai-score-low";
        }

        const scorePara = document.createElement('p');
        scorePara.innerHTML = `<strong>AI Detection Score:</strong> <span class="${scoreClass}">${(score === "N/A" ? "N/A" : (score * 100).toFixed(1) + "%")}</span> (probability of being AI-generated)`;
        resultContainer.appendChild(scorePara);
        
        const interpretationPara = document.createElement('p');
        interpretationPara.innerHTML = `<strong>Interpretation:</strong> ${interpretation}`;
        resultContainer.appendChild(interpretationPara);

        if (data.prediction_label && data.model_score !== undefined && data.model_score !== "N/A") {
            const modelDetails = document.createElement('p');
            modelDetails.className = 'model-raw-details';
            modelDetails.innerHTML = `(Model classified as: '${data.prediction_label}' with confidence: ${(data.model_score * 100).toFixed(1)}%)`;
            resultContainer.appendChild(modelDetails);
        }
        
        const disclaimer = document.createElement('p');
        disclaimer.className = 'ai-disclaimer';
        disclaimer.innerHTML = "<strong>Note:</strong> AI detection models (especially older ones like this GPT-2 detector) have limitations and can produce false positives or negatives. This result is indicative and should be used with caution, particularly for texts generated by newer AI models.";
        resultContainer.appendChild(disclaimer);

        aiTextResultsDiv.appendChild(resultContainer);
    }
});
