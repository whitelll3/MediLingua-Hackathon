/**
 * Simple WebAudio Recorder for MediLingua
 * 
 * This script provides enhanced audio recording capabilities with automatic pause detection.
 * It's designed to work with the main application to provide a seamless recording experience.
 */

class AudioRecorder {
    constructor(options = {}) {
        this.pauseThreshold = options.pauseThreshold || 2.0; // Default 2 seconds silence detection
        this.audioContext = null;
        this.stream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.analyser = null;
        this.silenceStart = null;
        this.silenceDetectionInterval = null;
    }

    async start() {
        if (this.isRecording) {
            console.warn('Recording is already in progress');
            return;
        }

        try {
            // Request audio stream
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyzer for silence detection
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            // Connect stream to analyzer
            const source = this.audioContext.createMediaStreamSource(this.stream);
            source.connect(this.analyser);
            
            // Create and start recorder
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];
            
            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Start silence detection
            this.startSilenceDetection();
            
            console.log('Recording started with automatic pause detection');
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            return false;
        }
    }

    stop() {
        if (!this.isRecording) {
            console.warn('No recording in progress');
            return null;
        }
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                // Clean up
                this.stopSilenceDetection();
                this.isRecording = false;
                
                // Create result blob
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                
                // Stop tracks
                this.stream.getTracks().forEach(track => track.stop());
                
                console.log('Recording stopped');
                resolve(audioBlob);
            };
            
            this.mediaRecorder.stop();
        });
    }

    startSilenceDetection() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        this.silenceDetectionInterval = setInterval(() => {
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume level
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            
            // Detect silence (threshold can be adjusted)
            const silenceThreshold = 5;
            if (average < silenceThreshold) {
                if (this.silenceStart === null) {
                    this.silenceStart = Date.now();
                } else if (Date.now() - this.silenceStart > this.pauseThreshold * 1000) {
                    // Silence exceeded threshold, stop recording
                    console.log('Silence detected for ' + this.pauseThreshold + ' seconds, stopping recording');
                    clearInterval(this.silenceDetectionInterval);
                    this.stop();
                }
            } else {
                // Reset silence timer if sound detected
                this.silenceStart = null;
            }
        }, 100);
    }

    stopSilenceDetection() {
        if (this.silenceDetectionInterval) {
            clearInterval(this.silenceDetectionInterval);
            this.silenceDetectionInterval = null;
        }
        this.silenceStart = null;
    }
}

// Export the recorder class
window.AudioRecorder = AudioRecorder;