import vertexai
from vertexai.generative_models import GenerativeModel, Part
import os

PROJECT_ID = "saludable-erp"
LOCATION = "us-central1"
MODEL_NAME = "gemini-2.5-flash"

try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel(MODEL_NAME)
    print(f"Vertex AI initialized successfully on project '{PROJECT_ID}' in '{LOCATION}' with model '{MODEL_NAME}'.")
    
    # Test simple prompt
    response = model.generate_content("Responde en una palabra: 'Conectado'")
    print(f"Vertex AI response: {response.text.strip()}")
except Exception as e:
    print(f"Vertex AI error: {e}")
    # Fallback to gemini-1.5-flash if gemini-2.5-flash name differs
    try:
        print("Trying fallback model 'gemini-1.5-flash'...")
        model = GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Responde en una palabra: 'Conectado'")
        print(f"Fallback response: {response.text.strip()}")
    except Exception as e2:
        print(f"Fallback error: {e2}")
