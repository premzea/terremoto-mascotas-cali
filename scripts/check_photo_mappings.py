import json
import os
import glob

# Load seed_pets
with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

# Find Poker
poker = next(p for p in pets if p.get("id") == "B9")
print(f"Target: {poker['id']} ({poker['name']}), photo: {poker['photo_url']}")

# Check all pets photo_url
photo_counts = {}
for p in pets:
    purl = p.get("photo_url")
    if purl:
        photo_counts[purl] = photo_counts.get(purl, []) + [p.get("id")]

duplicates = {k: v for k, v in photo_counts.items() if len(v) > 1}
print(f"Photos shared by multiple pet IDs ({len(duplicates)}):")
for k, v in list(duplicates.items())[:10]:
    print(f"  {k} -> {v}")
