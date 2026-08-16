import json
import os
import glob

# Load seed_pets
with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

# Find all entries with generic photos or missing real photos
valid_pets = []
removed = []

for p in pets:
    pid = p["id"]
    purl = p.get("photo_url", "")
    
    # Check if this pet has an actual photo in docs/Fotos
    matching_photos = glob.glob(f"docs/Fotos/{pid}.*")
    
    if matching_photos:
        # Real authentic photo exists for this specific ID!
        valid_pets.append(p)
    elif purl.startswith("/photos/") and os.path.exists(purl.lstrip("/")):
        # Check if the photo is a generic shared image
        fname = os.path.basename(purl)
        if "Cartel" in fname or "Pitbull San Fernando" in fname:
            removed.append(p)
        else:
            valid_pets.append(p)
    else:
        removed.append(p)

print(f"Total pets original: {len(pets)}")
print(f"Valid pets with authentic individual photos: {len(valid_pets)}")
print(f"Removed pets (with shared/fake photos): {len(removed)}")
for r in removed:
    print(f"  Removed: ID={r['id']}, Name={r['name']}, Photo={r.get('photo_url')}")

with open("src/data/seed_pets.json", "w", encoding="utf-8") as f:
    json.dump(valid_pets, f, indent=2, ensure_ascii=False)
