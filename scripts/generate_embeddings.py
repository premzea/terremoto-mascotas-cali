import json
import os
import math
import hashlib

# Standardized feature vocabulary for disaster pets
COLORS = ["blanco", "negro", "cafe", "amarillo", "naranja", "gris", "miel", "dorado", "canela", "crema", "tricolor"]
PATTERNS = ["manchas", "rayas", "solido", "atigrado", "bicolor", "parches", "carey"]
BREEDS = [
    "pastor", "labrador", "golden", "pitbull", "bull", "salchicha", "dachshund", "husky", "siberiano",
    "pincher", "poodle", "caniche", "schnauzer", "criollo", "mestizo", "chihuahua", "pug", "beagle",
    "boxer", "rottweiler", "cocker", "spaniel", "bobtail", "siames", "persa", "angora", "calico"
]
SIZES = ["pequeño", "pequeno", "mediano", "grande", "gigante"]
DISTINCTIVE = [
    "collar", "arnes", "pañoleta", "panoleta", "placa", "orejas caidas", "orejas erectas",
    "cola corta", "cola larga", "cicatriz", "mancha ojo", "patas blancas", "pecho blanco"
]

VOCAB = COLORS + PATTERNS + BREEDS + SIZES + DISTINCTIVE
VOCAB_INDEX = {word: i for i, word in enumerate(VOCAB)}
DIMENSION = len(VOCAB) + 32 # Vocabulary + Hashed semantic bins

def text_to_vector(text):
    vec = [0.0] * DIMENSION
    if not text:
        return vec
        
    lower = text.lower()
    
    # 1. Exact vocabulary matching
    for word, idx in VOCAB_INDEX.items():
        if word in lower:
            # Weighted importance
            weight = 2.0 if word in BREEDS else (1.5 if word in COLORS else 1.0)
            vec[idx] += weight
            
    # 2. Semantic n-gram hashing for unlisted terms
    words = re_tokenize(lower)
    for w in words:
        if len(w) >= 3 and w not in VOCAB_INDEX:
            h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16) % 32
            vec[len(VOCAB) + h] += 0.5
            
    # Normalize vector to unit length
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
        
    return vec

def re_tokenize(text):
    import re
    return re.findall(r'\b[a-záéíóúñ]+\b', text)

def generate_all_embeddings():
    seed_file = "src/data/seed_pets.json"
    if not os.path.exists(seed_file):
        print("seed_pets.json not found")
        return
        
    with open(seed_file, "r", encoding="utf-8") as f:
        pets = json.load(f)
        
    embeddings_cache = {}
    for pet in pets:
        pet_id = pet.get("id")
        text_corpus = f"{pet.get('name', '')} {pet.get('species', '')} {pet.get('primary_color', '')} {pet.get('pattern', '')} {pet.get('size', '')} {pet.get('distinctive_features', '')} {pet.get('neighborhood', '')}"
        vec = text_to_vector(text_corpus)
        embeddings_cache[pet_id] = vec
        
    output_file = "src/data/embeddings_cache.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(embeddings_cache, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully generated embeddings for {len(embeddings_cache)} pets (vector dim: {DIMENSION}) into {output_file}")

if __name__ == "__main__":
    generate_all_embeddings()
