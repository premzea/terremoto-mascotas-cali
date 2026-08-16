import os
import glob
import json

# Check actual extensions in docs/Fotos for R1..R146 and B1..B107
with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

mismatches = []
for p in pets:
    pid = p["id"]
    purl = p.get("photo_url", "")
    # Check if this exact file exists in public/photos
    public_path = purl.lstrip("/")
    if not os.path.exists(public_path):
        # find what actual file exists in docs/Fotos
        actual = glob.glob(f"docs/Fotos/{pid}.*")
        mismatches.append({
            "id": pid,
            "configured_url": purl,
            "actual_docs": actual
        })

print(f"Total photo mismatches in seed_pets.json: {len(mismatches)}")
for m in mismatches[:15]:
    print(m)
