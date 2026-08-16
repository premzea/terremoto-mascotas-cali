import json
import numpy as np

with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
    pets = json.load(f)

with open("src/data/visual_features_v2_cache.json", "r", encoding="utf-8") as f:
    v2_cache = json.load(f)

with open("src/data/dinov2_embeddings.json", "r", encoding="utf-8") as f:
    dino_cache = json.load(f)

r33 = next(p for p in pets if p.get("id") == "R33")
r33_v2 = v2_cache.get("R33", {})
r33_dino = np.array(dino_cache.get("R33", []))

lost_cats = [p for p in pets if p.get("species") == "CAT" and p.get("report_type") == "LOST"]

print(f"Testing R33 (Gender={r33['gender']}, Colors={r33_v2.get('coat_colors')}) against all {len(lost_cats)} lost cats:")

for cat in lost_cats:
    cid = cat["id"]
    cv2 = v2_cache.get(cid, {})
    cdino = np.array(dino_cache.get(cid, []))
    
    # Check gender conflict
    gender_conflict = (r33["gender"] != "UNKNOWN" and cat["gender"] != "UNKNOWN" and r33["gender"] != cat["gender"])
    
    sim = np.dot(r33_dino, cdino) if len(r33_dino) > 0 and len(cdino) > 0 else 0
    
    # Calculate score without gender block
    t_colors = r33_v2.get("coat_colors", [])
    c_colors = cv2.get("coat_colors", [])
    common = set(t_colors).intersection(set(c_colors))
    jaccard = len(common) / len(set(t_colors).union(set(c_colors))) if t_colors and c_colors else 0
    char_score = round(jaccard * 22)
    if r33_v2.get("coat_pattern") == cv2.get("coat_pattern") and r33_v2.get("coat_pattern") != "UNKNOWN":
        char_score += 10
    if r33_v2.get("head_and_muzzle_shape") == cv2.get("head_and_muzzle_shape") and r33_v2.get("head_and_muzzle_shape") != "UNKNOWN":
        char_score += 6
    if r33_v2.get("ear_type") == cv2.get("ear_type") and r33_v2.get("ear_type") != "UNKNOWN":
        char_score += 5
    if r33_v2.get("body_build") == cv2.get("body_build") and r33_v2.get("body_build") != "UNKNOWN":
        char_score += 4
        
    dino_score = round(max(0, sim) * 50)
    total_score = min(100, char_score + dino_score)
    
    if "BLACK" in c_colors or total_score > 30:
        print(f"  Cat #{cid} ({cat['name']}): Gender={cat['gender']}, GenderBlocked={gender_conflict}, Colors={c_colors}, TotalScore={total_score}%, DinoSim={sim:.3f}")
