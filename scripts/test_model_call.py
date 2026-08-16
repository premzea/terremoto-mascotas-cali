import os
from google import genai
from PIL import Image

api_key = None
if os.path.exists(".env.local"):
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                api_key = line.strip().split("=", 1)[1].strip('"').strip("'")

client = genai.Client(api_key=api_key)

test_models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
]

for model_name in test_models:
    try:
        print(f"Testing model: '{model_name}'...")
        res = client.models.generate_content(
            model=model_name,
            contents="Say 'OK' in one word."
        )
        print(f"SUCCESS with '{model_name}': {res.text.strip()}")
        break
    except Exception as e:
        print(f"Failed with '{model_name}': {e}")
