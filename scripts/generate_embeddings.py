import json
import os
import math
import hashlib

COLORS = [
    "negro", "blanco", "cafe", "marron", "amarillo", "miel", "naranja", "gris",
    "dorado", "canela", "crema", "tricolor", "atigrado", "bicolor"
]
PATTERNS = ["solido", "manchas", "rayas", "atigrado", "bicolor", "carey", "parches"]
BREEDS = [
    "pastor", "belga", "malinois", "holandes", "aleman", "labrador", "golden",
    "pitbull", "bull", "salchicha", "dachshund", "husky", "siberiano", "pincher",
    "poodle", "caniche", "schnauzer", "criollo", "mestizo", "chihuahua", "pug",
    "beagle", "boxer", "rottweiler", "cocker", "spaniel", "bobtail", "siames",
    "persa", "angora", "calico", "maine", "coon"
]
EAR_TYPES = ["erectas", "caidas", "semi-erectas", "puntiagudas"]
FUR_LENGTHS = ["corto", "mediano", "largo"]

VOCAB = COLORS + PATTERNS + BREEDS + EAR_TYPES + FUR_LENGTHS
VOCAB_INDEX = {word: i for i, word in enumerate(VOCAB)}
DIMENSION = len(VOCAB) + 32

def text_to_vector(text):
    vec = [0.0] * DIMENSION
    if not text:
        return vec
        
    lower = text.lower()
    
    # 1. Exact vocabulary matching with boosted weights for visual identifiers
    for word, idx in VOCAB_INDEX.items():
        if word in lower:
            if word in COLORS:
                weight = 4.0 # Very high weight for color
            elif word in BREEDS:
                weight = 3.0 # High weight for breed
            elif word in EAR_TYPES:
                weight = 2.5 # High weight for ear structure
            elif word in PATTERNS:
                weight = 2.0
            else:
                weight = 1.0
            vec[idx] += weight
            
    # 2. Semantic n-gram hashing
    import re
    words = re.findall(r'\b[a-záéíóúñ]+\b', lower)
    for w in words:
        if len(w) >= 3 and w not in VOCAB_INDEX:
            h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16) % 32
            vec[len(VOCAB) + h] += 0.5
            
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
        
    return vec

def generate_embeddings():
    seed_file = "src/data/seed_pets.json"
    cache_file = "src/data/visual_features_cache.json"
    
    with open(seed_file, "r", encoding="utf-8") as f:
        pets = json.load(f)

    visual_features = {}
    if os.path.exists(cache_file):
        with open(cache_file, "r", encoding="utf-8") as f:
            visual_features = json.load(f)

    embeddings = {}
    for pet in pets:
        pet_id = pet.get("id")
        vf = visual_features.get(pet_id, {})
        
        # Build rich visual + textual corpus
        visual_text = ""
        if vf:
            visual_text = f"{vf.get('species', '')} {vf.get('breed_likely', '')} {vf.get('primary_color', '')} {vf.get('secondary_color', '')} {vf.get('coat_pattern', '')} {vf.get('ear_type', '')} {vf.get('fur_length', '')} {vf.get('distinctive_marks', '')} {vf.get('search_summary', '')}"
            
        spreadsheet_text = f"{pet.get('name', '')} {pet.get('species', '')} {pet.get('primary_color', '')} {pet.get('distinctive_features', '')} {pet.get('neighborhood', '')}"
        
        combined_corpus = f"{visual_text} {visual_text} {spreadsheet_text}" # Boost visual traits 2x
        vec = text_to_vector(combined_corpus)
        embeddings[pet_id] = vec

    output_file = "src/data/embeddings_cache.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(embeddings, f, ensure_ascii=False, indent=2)

    print(f"Successfully compiled multimodal visual embeddings for {len(embeddings)} pets into {output_file}")

if __name__ == "__main__":
    generate_embeddings()
