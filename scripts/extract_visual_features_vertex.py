import json
import os
import time
import sys
from typing import Optional, Dict, Any
import vertexai
from vertexai.generative_models import GenerativeModel, Part, GenerationConfig

PROJECT_ID = "saludable-erp"
LOCATION = "us-central1"
MODEL_NAME = "gemini-2.5-flash"

SYSTEM_PROMPT = """Eres un experto veterinario y perito en identificación visual de animales en emergencias de desastres.
Analiza la fotografía de la mascota y extrae sus rasgos físicos con precisión para cotejo de búsqueda.
Responde ÚNICAMENTE con un objeto JSON válido con este esquema exacto:
{
  "species": "DOG" | "CAT" | "OTHER",
  "breed_likely": string (ej: "Pastor Holandés / Belga", "Criollo mestizo", "Salchicha", "Pitbull", "Siamés", "Poodle"),
  "primary_color": string (ej: "Negro", "Blanco", "Marrón/Café", "Amarillo/Miel", "Naranja", "Gris"),
  "secondary_color": string,
  "coat_pattern": "SOLIDO" | "MANCHAS" | "RAYAS" | "BICOLOR" | "CAREY",
  "ear_type": "ERECTAS" | "CAIDAS" | "SEMI-ERECTAS",
  "fur_length": "CORTO" | "MEDIANO" | "LARGO",
  "distinctive_marks": string (ej: "Bandana naranja, collar rojo, mancha en ojo, pecho blanco"),
  "search_summary": string (resumen conciso de 1 línea de los rasgos visuales clave)
}
"""

def extract_visual_features(image_path: str, model: Any) -> Optional[Dict[str, Any]]:
    if not os.path.exists(image_path):
        return None
        
    with open(image_path, "rb") as f:
        image_bytes = f.read()
        
    mime_type = "image/png" if image_path.lower().endswith(".png") else "image/jpeg"
    image_part = Part.from_data(data=image_bytes, mime_type=mime_type)
    
    config = GenerationConfig(
        response_mime_type="application/json",
        temperature=0.1,
    )
    
    try:
        response = model.generate_content(
            [image_part, "Analiza esta mascota y extrae sus rasgos físicos."],
            generation_config=config
        )
        data = json.loads(response.text.strip())
        return data
    except Exception as e:
        print(f"Error analyzing {image_path}: {e}")
        return None

def main():
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PROMPT)
    
    seed_file = "src/data/seed_pets.json"
    with open(seed_file, "r", encoding="utf-8") as f:
        pets = json.load(f)

    cache_file = "src/data/visual_features_cache.json"
    visual_cache = {}
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                visual_cache = json.load(f)
        except Exception:
            visual_cache = {}

    total = len(pets)
    updated = 0
    print(f"Starting batch analysis for {total} pets with Vertex AI {MODEL_NAME}...")

    for i, pet in enumerate(pets):
        pet_id = pet.get("id")
        if not pet_id or pet_id in visual_cache:
            continue
            
        photo_url = pet.get("photo_url", "")
        if not photo_url or not photo_url.startswith("/photos/"):
            continue
            
        local_path = os.path.join("public", photo_url.lstrip("/"))
        if not os.path.exists(local_path):
            continue
            
        print(f"[{i+1}/{total}] Processing {pet_id} ({pet.get('name')}) via Vertex AI...")
        traits = extract_visual_features(local_path, model)
        if traits:
            visual_cache[pet_id] = traits
            updated += 1
            # Save progressively
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(visual_cache, f, ensure_ascii=False, indent=2)
                
        time.sleep(0.3) # Fast throughput

    print(f"Successfully processed and cached {len(visual_cache)} pets visual traits.")

if __name__ == "__main__":
    main()
