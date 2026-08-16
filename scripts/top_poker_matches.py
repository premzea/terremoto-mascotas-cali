import json
import numpy as np

# Load all
with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

with open("src/data/visual_features_v2_cache.json", "r", encoding="utf-8") as f:
    v2_cache = json.load(f)

with open("src/data/dinov2_embeddings.json", "r", encoding="utf-8") as f:
    dino_cache = json.load(f)

poker = next(p for p in pets if p.get("id") == "B9")
poker_v2 = v2_cache.get("B9", {})
poker_dino = np.array(dino_cache.get("B9", []))

rescued = [p for p in pets if p.get("report_type") in ["FOUND", "SHELTERED"]]

matches = []
for c in rescued:
    cid = c["id"]
    if c.get("species") != poker.get("species"):
        continue
    
    cv2 = v2_cache.get(cid, {})
    cdino = np.array(dino_cache.get(cid, []))
    
    # Cosine sim
    dino_sim = 0
    if len(poker_dino) > 0 and len(cdino) > 0:
        dino_sim = np.dot(poker_dino, cdino)
    
    # Colors
    t_colors = poker_v2.get("coat_colors", [])
    c_colors = cv2.get("coat_colors", [])
    
    common = set(t_colors).intersection(set(c_colors))
    jaccard = len(common) / len(set(t_colors).union(set(c_colors))) if t_colors and c_colors else 0
    
    char_score = round(jaccard * 22)
    if poker_v2.get("coat_pattern") == cv2.get("coat_pattern") and poker_v2.get("coat_pattern") != "UNKNOWN":
        char_score += 10
    if poker_v2.get("head_and_muzzle_shape") == cv2.get("head_and_muzzle_shape") and poker_v2.get("head_and_muzzle_shape") != "UNKNOWN":
        char_score += 6
    if poker_v2.get("ear_type") == cv2.get("ear_type") and poker_v2.get("ear_type") != "UNKNOWN":
        char_score += 5
    if poker_v2.get("body_build") == cv2.get("body_build") and poker_v2.get("body_build") != "UNKNOWN":
        char_score += 4
        
    dino_score = round(max(0, dino_sim) * 50)
    total_score = min(100, char_score + dino_score)
    
    matches.append({
        "id": cid,
        "name": c["name"],
        "photo_url": c["photo_url"],
        "total_score": total_score,
        "char_score": char_score,
        "dino_score": dino_score,
        "dino_sim": float(dino_sim),
        "c_colors": c_colors,
        "c_pattern": cv2.get("coat_pattern"),
        "c_build": cv2.get("body_build"),
        "c_size": cv2.get("size")
    })

matches.sort(key=lambda x: x["total_score"], reverse=True)
print(f"Top 10 matches for Poker (B9 - Colors={poker_v2.get('coat_colors')}, Pattern={poker_v2.get('coat_pattern')}):")
for m in matches[:10]:
    print(f"  #{m['id']} (Score: {m['total_score']}%, Dino: {m['dino_score']}/50, DinoSim: {m['dino_sim']:.3f}, Char: {m['char_score']}/50) -> Photo: {m['photo_url']}, Colors: {m['c_colors']}, Pattern: {m['c_pattern']}, Build: {m['c_build']}")
