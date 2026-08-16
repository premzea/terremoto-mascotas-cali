import json

with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

# Replicate findBestMatches in Python for B9
# Let's import dino and v2
with open("src/data/visual_features_v2_cache.json", "r", encoding="utf-8") as f:
    v2_cache = json.load(f)

with open("src/data/dinov2_embeddings.json", "r", encoding="utf-8") as f:
    dino_cache = json.load(f)

poker = next(p for p in pets if p.get("id") == "B9")
print("Poker:", poker["id"], poker["name"], poker["photo_url"], poker.get("size"))

# Print first 5 matches using python simulation
rescued = [p for p in pets if p.get("report_type") in ["FOUND", "SHELTERED"]]

scores = []
for c in rescued:
    cid = c["id"]
    # Check photo url
    scores.append({
        "id": cid,
        "name": c["name"],
        "photo_url": c["photo_url"],
        "size": c.get("size"),
        "v2_size": v2_cache.get(cid, {}).get("size"),
        "v2_colors": v2_cache.get(cid, {}).get("coat_colors"),
    })

# Check what actual image files exist for these candidates
import os
for s in scores[:10]:
    exists = os.path.exists(s["photo_url"].lstrip("/"))
    print(f"Candidate {s['id']}: photo={s['photo_url']}, exists_on_disk={exists}")
