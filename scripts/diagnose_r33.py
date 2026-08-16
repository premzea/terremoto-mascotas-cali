import json
import numpy as np

# Load all data
with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

with open("src/data/visual_features_v2_cache.json", "r", encoding="utf-8") as f:
    v2_cache = json.load(f)

with open("src/data/dinov2_embeddings.json", "r", encoding="utf-8") as f:
    dino_cache = json.load(f)

# Find R33 and Mavis
r33 = next((p for p in pets if p.get("id") == "R33"), None)
mavis = next((p for p in pets if "mavis" in p.get("name", "").lower()), None)
all_black_cats_lost = [p for p in pets if p.get("species") == "CAT" and p.get("report_type") == "LOST"]

print("=== R33 DATA ===")
print("Seed:", r33)
print("V2:", v2_cache.get("R33"))
print("Has Dino:", "R33" in dino_cache)

print("\n=== MAVIS DATA ===")
print("Seed:", mavis)
if mavis:
    print("V2:", v2_cache.get(mavis.get("id")))
    print("Has Dino:", mavis.get("id") in dino_cache)

print(f"\nTotal LOST Cats in dataset: {len(all_black_cats_lost)}")
for cat in all_black_cats_lost:
    cid = cat["id"]
    cv2 = v2_cache.get(cid, {})
    print(f"  Cat {cid} ({cat['name']}): Colors={cv2.get('coat_colors')}, Gender={cat.get('gender')}, Size={cat.get('size')}, Pattern={cv2.get('coat_pattern')}")
