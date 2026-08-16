import json
import os

with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

for p in pets:
    purl = p.get("photo_url", "")
    fname = purl.replace("/photos/", "")
    full_path = os.path.join("public/photos", fname)
    if not os.path.exists(full_path):
        print(f"MISSING: {p['id']} -> {purl} ({full_path})")

print("Verification complete.")
