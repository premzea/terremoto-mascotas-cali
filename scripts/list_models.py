import os
from google import genai

api_key = None
if os.path.exists(".env.local"):
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                api_key = line.strip().split("=", 1)[1].strip('"').strip("'")

print(f"API Key present: {bool(api_key)}")
client = genai.Client(api_key=api_key)
flash_models = [m.name for m in client.models.list() if "flash" in m.name]
print("Available Flash Models:")
for m in flash_models:
    print(f" - {m}")
