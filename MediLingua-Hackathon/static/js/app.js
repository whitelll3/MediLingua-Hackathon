// MediLingua Main Application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const recordButton = document.getElementById('recordButton');
    const stopButton = document.getElementById('stopButton');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioPlayback = document.getElementById('audioPlayback');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTimer = document.getElementById('recordingTimer');
    const recordingProgress = document.getElementById('recordingProgress');
    const transcriptionSection = document.getElementById('transcriptionSection');
    const transcriptionResult = document.getElementById('transcriptionResult');
    const translationSection = document.getElementById('translationSection');
    const translateButton = document.getElementById('translateButton');
    const targetLanguage = document.getElementById('targetLanguage');
    const translationResult = document.getElementById('translationResult');
    const deanonymizedSection = document.getElementById('deanonymizedSection');
    const deanonymizedResult = document.getElementById('deanonymizedResult');
    const wordCount = document.getElementById('wordCount');

    // Recorder variables
    let mediaRecorder;
    let audioChunks = [];
    let startTime;
    let timerInterval;
    let progressInterval;
    let audioBlob;

    // Initialize recording functionality
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('MediaDevices supported');

        // Request microphone access
        recordButton.addEventListener('click', function() {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    // Setup MediaRecorder
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    // Start recording
                    mediaRecorder.start();
                    console.log('Recording started');
                    
                    // Update UI for recording state
                    recordButton.disabled = true;
                    stopButton.disabled = false;
                    recordingStatus.classList.remove('d-none');
                    recordButton.classList.add('recording');
                    
                    // Start timer
                    startTime = Date.now();
                    startTimer();
                    startProgressBar();

                    // Handle data available event
                    mediaRecorder.addEventListener('dataavailable', event => {
                        audioChunks.push(event.data);
                    });

                    // Handle recording stop event
                    mediaRecorder.addEventListener('stop', () => {
                        // Create audio blob and URL
                        audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        
                        // Update audio player
                        audioPlayer.src = audioUrl;
                        audioPlayback.classList.remove('d-none');
                        
                        // Stop and reset UI elements
                        clearInterval(timerInterval);
                        clearInterval(progressInterval);
                        recordButton.classList.remove('recording');
                        
                        // Upload recorded audio for transcription
                        uploadAudioForTranscription(audioBlob);
                    });
                })
                .catch(error => {
                    console.error('Error accessing media devices:', error);
                    alert('Error accessing microphone. Please check your permissions and try again.');
                });
        });

        // Handle stop button click
        stopButton.addEventListener('click', function() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                console.log('Recording stopped');
                
                // Update UI
                recordButton.disabled = false;
                stopButton.disabled = true;
            }
        });
    } else {
        alert('Your browser does not support media recording. Please use a modern browser like Chrome, Firefox, or Edge.');
        recordButton.disabled = true;
    }

    // Handle translation button click
    translateButton.addEventListener('click', function() {
        const language = targetLanguage.value.trim();
        if (!language) {
            alert('Please enter a target language');
            return;
        }

        const text = transcriptionResult.textContent;
        if (!text) {
            alert('No transcription available to translate');
            return;
        }

        translateText(text, language);
    });

    // Timer functions
    function startTimer() {
        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        recordingTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function startProgressBar() {
        let width = 0;
        progressInterval = setInterval(() => {
            if (width >= 100) {
                width = 0;
            } else {
                width += 0.5;
            }
            recordingProgress.style.width = width + '%';
        }, 100);
    }

    // API interaction functions
    function uploadAudioForTranscription(blob) {
        // Create FormData to send the audio file
        const formData = new FormData();
        formData.append('audio', blob, 'recording.wav');

        // Show loading indicator
        transcriptionResult.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Transcribing audio...</p></div>';
        transcriptionSection.classList.remove('d-none');

        // Send to server
        fetch('/transcribe', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.transcribed_text) {
                // Display transcription
                transcriptionResult.textContent = data.transcribed_text;
                
                // Update word count
                updateWordCount(data.transcribed_text);
                
                // Show translation section
                translationSection.classList.remove('d-none');
            } else {
                transcriptionResult.textContent = 'No transcription results available.';
                updateWordCount('');
            }
        })
        .catch(error => {
            console.error('Error during transcription:', error);
            transcriptionResult.textContent = 'Error during transcription. Please try again.';
        });
    }

    function translateText(text, language) {
        // Show loading indicators
        translationResult.innerHTML = '<div class="text-center"><div class="spinner-border text-success" role="status"></div><p>Translating...</p></div>';
        translationResult.classList.remove('d-none');

        deanonymizedResult.innerHTML = '<div class="text-center"><div class="spinner-border text-warning" role="status"></div><p>Generating HIPAA compliant version...</p></div>';
        deanonymizedSection.classList.remove('d-none');

        // Send to server
        fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                language: language
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Display translation
            if (data.translated_text) {
                translationResult.textContent = data.translated_text;
            } else {
                translationResult.textContent = 'No translation available.';
            }

            // Display deanonymized version
            if (data.deanonymized_text) {
                deanonymizedResult.textContent = data.deanonymized_text;
            } else {
                deanonymizedResult.textContent = 'No deanonymized version available.';
            }
        })
        .catch(error => {
            console.error('Error during translation:', error);
            translationResult.textContent = 'Error during translation. Please try again.';
            deanonymizedResult.textContent = 'Error generating HIPAA compliant version. Please try again.';
        });
    }

    // Word count function
    function updateWordCount(text) {
        if (!text || typeof text !== 'string') {
            wordCount.textContent = '0 words';
            return;
        }
        
        // Count words by splitting on whitespace and filtering out empty strings
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const count = words.length;
        
        wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
    }
});