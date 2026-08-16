import json
import os
import vertexai
from vertexai.generative_models import GenerativeModel, Part, GenerationConfig

PROJECT_ID = "saludable-erp"
LOCATION = "us-central1"
MODEL_NAME = "gemini-2.5-flash"

vertexai.init(project=PROJECT_ID, location=LOCATION)

SYSTEM_PROMPT = """Eres un experto veterinario y perito en identificación visual de animales en emergencias de desastres.
Analiza la fotografía de la mascota y extrae sus rasgos físicos con precisión para cotejo de búsqueda.
Responde ÚNICAMENTE con un objeto JSON válido con este esquema exacto:
{
  "species": "DOG" | "CAT" | "OTHER",
  "breed_likely": string (ej: "Pastor Holandés / Belga", "Criollo mestizo", "Salchicha", "Pitbull", "Siamés"),
  "primary_color": string (ej: "Negro sólido", "Blanco con manchas cafés", "Atigrado gris", "Naranja", "Amarillo/Miel"),
  "secondary_color": string,
  "coat_pattern": "SOLIDO" | "MANCHAS" | "RAYAS" | "BICOLOR" | "CAREY",
  "ear_type": "ERECTAS" | "CAIDAS" | "SEMI-ERECTAS",
  "fur_length": "CORTO" | "MEDIANO" | "LARGO",
  "distinctive_marks": string (ej: "Mancha blanca en pecho, orejas puntiagudas, collar rojo"),
  "search_summary": string (resumen conciso de 1 línea de los rasgos visuales clave)
}
"""

model = GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PROMPT)

def test_single_photo(photo_path):
    print(f"\n--- Testing Photo: {photo_path} ---")
    if not os.path.exists(photo_path):
        print("File not found")
        return
        
    with open(photo_path, "rb") as f:
        image_bytes = f.read()
        
    mime_type = "image/png" if photo_path.endswith(".png") else "image/jpeg"
    image_part = Part.from_data(data=image_bytes, mime_type=mime_type)
    
    config = GenerationConfig(
        response_mime_type="application/json",
        temperature=0.1
    )
    
    response = model.generate_content(
        [image_part, "Analiza visualmente esta mascota."],
        generation_config=config
    )
    print("Extracted Visual JSON:")
    print(response.text)

if __name__ == "__main__":
    test_single_photo("public/photos/B5.png") # Dakota
    test_single_photo("public/photos/R2.png") # Cocker Spaniel
