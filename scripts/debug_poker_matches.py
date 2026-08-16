import json
import math

# Replicate matching logic in python to see exact match results for B9
with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

with open("src/data/visual_features_v2_cache.json", "r", encoding="utf-8") as f:
    v2_cache = json.load(f)

with open("src/data/dinov2_embeddings.json", "r", encoding="utf-8") as f:
    dino_cache = json.load(f)

poker = next(p for p in pets if p.get("id") == "B9")
print("POKER:", poker)
print("Poker V2:", v2_cache.get("B9"))

# Let's inspect candidates
rescued = [p for p in pets if p.get("report_type") in ["FOUND", "SHELTERED"]]
print(f"Total rescued: {len(rescued)}")

# Check what photos exist in docs/Fotos for B9 vs R matches
import glob
print("Docs files for B9:", glob.glob("docs/Fotos/B9.*"))
print("Public files for B9:", glob.glob("public/photos/B9.*"))
