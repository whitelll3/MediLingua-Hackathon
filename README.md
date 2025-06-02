# MediLingua: AI-Powered Medical Documentation Assistant

## Overview

MediLingua redefines medical documentation by providing an AI-powered assistant designed specifically for healthcare professionals. With MediLingua, we aim to streamline the documentation process, enhance patient care, and ensure privacy and compliance with healthcare regulations. Leveraging advanced AI technologies, MediLingua offers voice-to-text transcription, real-time translation, and secure handling of sensitive patient information.

## Features

- **Voice-to-Text Transcription:** Effortlessly convert your voice notes into text, allowing for hands-free documentation while you focus on your patient.
- **Real-Time Translation:** Break down language barriers with instant translation of medical notes into the patient's native language, ensuring clear and effective communication.
- **Automated Privacy Protections:** With AI at its core, MediLingua safeguards patient information by automatically anonymizing data, in line with HIPAA compliance standards.
- **Intuitive Operation:** No need for manual input to pause recording. Simply stop speaking for 2 seconds, and MediLingua will automatically pause, streamlining your workflow.



https://github.com/user-attachments/assets/18b247dc-c146-49d0-9e50-dbfaa85eb4a1



## Installation

### Prerequisites

- Python 3.8 or higher
- FFmpeg installed on your system
- OpenAI API key (for Whisper transcription, GPT translation, and anonymization)

### Setup Instructions

1. Clone the repository:
   ```bash
   cd medilingua
   ```

2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up your API key:
   Create a file named `config.py` in the root directory with the following content:
   ```python
   # Configuration settings for MediLingua
   OPENAI_API_KEY = "your_openai_api_key"
   
   # Product Information
   PRODUCT_NAME = "MediLingua"
   
   # Market Research Data
   MARKET_RESEARCH = {
       "hipaa_fine_per_incident": "$50,000",
       "roi_per_institution": "$600,000 USD",
       "privacy_compliance_industry": "3.6 Billion USD annually",
       "translation_savings": "319.27 Million USD annually",
       "physician_time_savings": "$71,050/doctor/year"
   }
   ```

4. Run the application:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to `http://localhost:5000`

### Docker Setup (Alternative)

1. Build the Docker image:
   ```bash
   docker build -t medilingua .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 medilingua
   ```

## Usage Instructions

1. **Record Medical Notes:**
   - Click the "Start Recording" button to begin recording your voice
   - Speak clearly and at a moderate pace
   - The recording will automatically stop after 2 seconds of silence
   - Alternatively, click "Stop" to manually end the recording

2. **Transcribe and Review:**
   - Your recording will be automatically transcribed using OpenAI Whisper
   - Review the transcribed text for accuracy

3. **Translate to Patient's Language:**
   - Select the target language from the dropdown menu
   - Click "Translate" to convert the medical notes to the patient's preferred language
   - The translation preserves medical terminology while making it understandable for patients

4. **Generate HIPAA-Compliant Version:**
   - A deanonymized version of the notes will be automatically generated
   - This version removes personal identifiers while maintaining clinical information
   - Perfect for documentation that needs to be shared or stored in compliance with privacy regulations

## Technology Stack

- **Backend:** Flask (Python)
- **AI Services:** 
  - OpenAI Whisper API for transcription
  - OpenAI GPT-4o for translation and HIPAA compliance
- **Frontend:** HTML, CSS, JavaScript
- **Audio Processing:** FFmpeg

## Project Structure



```
medilingua/
├── app.py                 # Main Flask application
├── config.py              # Configuration file (API keys, etc.)
├── requirements.txt       # Python dependencies
├── Dockerfile             # Docker configuration
├── static/                # Static assets
│   ├── css/               # Stylesheet files
│   ├── js/                # JavaScript files
│   └── img/               # Images and icons
└── templates/             # HTML templates
    ├── index.html         # Main application page
    └── about.html         # About page with project information
```

## Market Research and Potential Impact

* HIPAA fines avoidance: $50,000 per incident
* Potential ROI per institution: $600,000 USD annually
* Industry potential for Privacy Compliance: 3.6 Billion USD annually
* Automated translation savings: 319.27 Million USD annually
* Physician time savings: $71,050 per doctor per year

## Future Enhancements

- Support for more medical specialties with domain-specific terminology
- Integration with Electronic Health Record (EHR) systems
- Mobile application for on-the-go use
- Expanded language support for underserved patient populations
- Custom medical terminology dictionaries for improved accuracy
