import os
import glob
import json

# Inspect actual filenames in public/photos and docs/Fotos
public_files = os.listdir("public/photos")
docs_files = os.listdir("docs/Fotos")

print(f"Total in public/photos: {len(public_files)}")
print(f"Sample in public/photos: {public_files[:20]}")

# Map each pet ID (e.g. B9, R1, R102) to its real existing file name in public/photos
real_file_map = {}
for f in public_files:
    base, ext = os.path.splitext(f)
    real_file_map[base.upper()] = f
    real_file_map[base] = f

with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

updated_count = 0
for p in pets:
    pid = p["id"]
    if pid in real_file_map:
        correct_file = real_file_map[pid]
        p["photo_url"] = f"/photos/{correct_file}"
        updated_count += 1
    elif pid.upper() in real_file_map:
        correct_file = real_file_map[pid.upper()]
        p["photo_url"] = f"/photos/{correct_file}"
        updated_count += 1

print(f"Updated {updated_count} photo_urls in seed_pets.json.")

with open("src/data/seed_pets.json", "w", encoding="utf-8") as f:
    json.dump(pets, f, indent=2, ensure_ascii=False)

# Let's verify for R1..R10 and B9
for p in pets[:15]:
    print(f"Pet {p['id']} -> {p['photo_url']}")
