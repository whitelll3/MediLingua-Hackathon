from flask import Flask, render_template, request, jsonify, session
import os
import tempfile
from werkzeug.utils import secure_filename
import config
import logging
import subprocess
import sys
import requests
import json

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[logging.StreamHandler()])
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = "medilingua_secret_key"
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# OpenAI API Configuration
# Add your OpenAI API key to config.py
OPENAI_API_KEY = getattr(config, 'OPENAI_API_KEY', None)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def validate_audio_file(file):
    """Basic validation for uploaded audio files"""
    allowed_extensions = ['.wav', '.mp3', '.m4a', '.flac']
    if not file.filename:
        return False
    return True

# Check if FFmpeg is installed
try:
    subprocess.run(['ffmpeg', '-version'], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    logger.info("FFmpeg is installed and working")
except (subprocess.SubprocessError, FileNotFoundError):
    logger.error("FFmpeg is not installed or not in PATH. Audio conversion may not work correctly.")

def transcribe_with_openai(audio_file_path):
    """
    Transcribe audio using OpenAI's Whisper API
    """
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not configured. Please add OPENAI_API_KEY to your config.py file.")
    
    # Check if file exists and is readable
    if not os.path.exists(audio_file_path):
        raise FileNotFoundError(f"The audio file at {audio_file_path} does not exist")
    
    # Read the file as binary
    with open(audio_file_path, "rb") as audio_file:
        # Prepare the request to OpenAI's API
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
        
        files = {
            "file": (os.path.basename(audio_file_path), audio_file, "audio/wav"),
            "model": (None, "whisper-1"),
            "response_format": (None, "json")
        }
        
        logger.info(f"Sending transcription request to OpenAI for {audio_file_path}")
        
        # Make the API request
        response = requests.post(url, headers=headers, files=files)
        
        # Check for successful response
        if response.status_code == 200:
            result = response.json()
            transcription = result.get("text", "")
            logger.info("OpenAI transcription successful")
            return transcription
        else:
            error_msg = f"OpenAI API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            raise Exception(error_msg)

def translate_with_chatgpt(text, target_language):
    """Use ChatGPT API to translate medical notes to target language."""
    if not OPENAI_API_KEY:
        return "Translation service unavailable - API key not configured"
    
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-4o",  # Using GPT-4o for best translation quality
            "messages": [
                {
                    "role": "system", 
                    "content": "You're a medical translator. Translate the following medical notes accurately into the specified language while preserving all medical terminology and information."
                },
                {
                    "role": "user", 
                    "content": f"Translate this medical note into {target_language}: \n\n{text}"
                }
            ],
            "temperature": 0.3  # Lower temperature for more accurate translations
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            result = response.json()
            translated_text = result["choices"][0]["message"]["content"]
            logger.info("ChatGPT translation successful")
            return translated_text
        else:
            error_msg = f"ChatGPT API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return f"Translation error: {error_msg}"
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return f"Translation error: {str(e)}"

def deanonymize_with_chatgpt(text):
    """Process the text to remove or alter personal identifiers for HIPAA compliance."""
    if not OPENAI_API_KEY:
        return "Deanonymization service unavailable - API key not configured"
    
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-4o",  # Using GPT-4o for best privacy protection
            "messages": [
                {
                    "role": "system", 
                    "content": "You're a privacy-compliance specialist. Your task is to ensure medical notes comply with HIPAA by removing or anonymizing personally identifiable information. Replace specific patient identifiers (names, addresses, phone numbers, specific ages, unique identifiers) with generic placeholders while preserving the medical content."
                },
                {
                    "role": "user", 
                    "content": f"Deanonymize this medical note for HIPAA compliance: \n\n{text}"
                }
            ],
            "temperature": 0.3  # Lower temperature for more consistent results
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            result = response.json()
            deanonymized_text = result["choices"][0]["message"]["content"]
            logger.info("ChatGPT deanonymization successful")
            return deanonymized_text
        else:
            error_msg = f"ChatGPT API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return f"Deanonymization error: {error_msg}"
    except Exception as e:
        logger.error(f"Deanonymization error: {str(e)}")
        return f"Deanonymization error: {str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'error': 'No audio file selected'}), 400
    
    # Create a temporary file to handle any audio format issues
    temp_file = None
    file_path = None
    
    try:
        # Save the uploaded file
        filename = secure_filename(audio_file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        audio_file.save(file_path)
        
        logger.info(f"Audio file saved at: {file_path}")
        
        # Check if file size is valid
        file_size = os.path.getsize(file_path)
        logger.info(f"Audio file size: {file_size} bytes")
        
        if file_size == 0:
            raise ValueError("The audio file is empty")
        
        # Create a temporary file with .wav extension if needed
        # OpenAI's Whisper API works better with WAV format
        if not file_path.lower().endswith(('.wav', '.mp3', '.m4a')):
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            temp_file.close()
            
            # Use FFmpeg to convert to WAV format
            subprocess.run(['ffmpeg', '-i', file_path, temp_file.name], 
                          check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            logger.info(f"Converted audio to WAV: {temp_file.name}")
            transcription_path = temp_file.name
        else:
            transcription_path = file_path
        
        # Transcribe audio using OpenAI's Whisper API
        logger.info(f"Starting transcription of {transcription_path}")
        transcribed_text = transcribe_with_openai(transcription_path)
        
        if not transcribed_text:
            raise ValueError("Transcription failed: No text returned from API")
            
        logger.info("Transcription successful")
        
        # Store in session for later use
        session['transcribed_text'] = transcribed_text
        
        # Clean up files
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
            
        if os.path.exists(file_path):
            os.unlink(file_path)
        
        return jsonify({'transcribed_text': transcribed_text})
    
    except FileNotFoundError as e:
        logger.error(f"File error: {str(e)}")
        return jsonify({'error': f'File error: {str(e)}'}), 404
        
    except PermissionError as e:
        logger.error(f"Permission error: {str(e)}")
        return jsonify({'error': f'Permission error: {str(e)}'}), 403
        
    except subprocess.SubprocessError as e:
        logger.error(f"FFmpeg error: {str(e)}")
        return jsonify({'error': 'Error processing audio file format'}), 500
        
    except ValueError as e:
        logger.error(f"Value error: {str(e)}")
        return jsonify({'error': str(e)}), 400
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error during transcription. Please try again. Details: {str(e)}'}), 500
        
    finally:
        # Ensure cleanup in case of any errors
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except:
                pass
                
        if file_path and os.path.exists(file_path):
            try:
                os.unlink(file_path)
            except:
                pass

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    target_language = data.get('language')
    text = data.get('text', session.get('transcribed_text', ''))
    
    if not text:
        return jsonify({'error': 'No text provided for translation'}), 400
    
    if not target_language:
        return jsonify({'error': 'No target language specified'}), 400
    
    # Translate the text using ChatGPT
    translated_text = translate_with_chatgpt(text, target_language)
    
    # Deanonymize for HIPAA compliance using ChatGPT
    deanonymized_text = deanonymize_with_chatgpt(text)
    
    return jsonify({
        'translated_text': translated_text,
        'deanonymized_text': deanonymized_text
    })

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/health')
def health_check():
    """Endpoint to check service health and dependencies"""
    health_status = {
        "status": "ok",
        "ffmpeg_installed": True,
        "openai_api": OPENAI_API_KEY is not None,
        "python_version": sys.version
    }
    
    try:
        subprocess.run(['ffmpeg', '-version'], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except:
        health_status["ffmpeg_installed"] = False
        health_status["status"] = "warning"
    
    if not health_status["openai_api"]:
        health_status["status"] = "error"
    
    return jsonify(health_status)

if __name__ == '__main__':
    app.run(debug=True)
