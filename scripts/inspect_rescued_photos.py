import json

with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

# Let's inspect all photo_urls in seed_pets
photo_map = {}
for p in pets:
    pid = p["id"]
    purl = p.get("photo_url", "")
    photo_map[pid] = purl

# Let's check R1 to R146
for r_id in ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R100", "R101", "R102", "R103"]:
    p = next((x for x in pets if x["id"] == r_id), None)
    if p:
        print(f"{r_id}: name={p['name']}, photo_url={p['photo_url']}")
