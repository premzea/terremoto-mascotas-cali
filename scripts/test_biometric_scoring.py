import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

def calculate_biometric_score(target_id, candidate_id):
    target = next((p for p in pets if p['id'] == target_id), None)
    candidate = next((p for p in pets if p['id'] == candidate_id), None)
    if not target or not candidate:
        return 0, []

    tv = vf.get(target_id, {})
    cv = vf.get(candidate_id, {})

    # Hard filter: Species
    if target['species'] != candidate['species']:
        return 0, ["Especie diferente"]

    # Hard filter: Sex
    if target['gender'] != 'UNKNOWN' and candidate['gender'] != 'UNKNOWN' and target['gender'] != candidate['gender']:
        return 0, ["Sexo incompatible"]

    score = 0
    breakdown = []

    # 1. Color (Max 25)
    t_color = (tv.get('primary_color') or target.get('primary_color') or '').lower()
    c_color = (cv.get('primary_color') or candidate.get('primary_color') or '').lower()
    t_sec = (tv.get('secondary_color') or '').lower()
    c_sec = (cv.get('secondary_color') or '').lower()

    if t_color and c_color:
        if t_color == c_color:
            score += 25
            breakdown.append(f"Color idéntico ({t_color}): +25")
        elif t_color in c_color or c_color in t_color or (t_sec and t_sec in c_color) or (c_sec and c_sec in t_color):
            score += 15
            breakdown.append(f"Tono compatible ({c_color}): +15")
        else:
            # Color clash
            if ('negro' in t_color and 'blanco' in c_color) or ('gris' in t_color and 'naranja' in c_color) or ('naranja' in t_color and 'gris' in c_color):
                return 0, ["Color excluyente"]
            score += 4
            breakdown.append("Color parcialmente compatible: +4")

    # 2. Breed (Max 20)
    t_breed = (tv.get('breed_likely') or '').lower()
    c_breed = (cv.get('breed_likely') or '').lower()
    if t_breed and c_breed:
        if t_breed == c_breed and t_breed != 'criollo mestizo':
            score += 20
            breakdown.append(f"Raza coincidente ({t_breed}): +20")
        elif ('pastor' in t_breed and 'pastor' in c_breed) or ('pitbull' in t_breed and 'pitbull' in c_breed):
            score += 18
            breakdown.append(f"Familia de raza coincidente: +18")
        elif t_breed == 'criollo mestizo' and c_breed == 'criollo mestizo':
            score += 8
            breakdown.append("Mestizo/Criollo: +8")

    # 3. Ear Type (Max 15)
    t_ears = tv.get('ear_type')
    c_ears = cv.get('ear_type')
    if t_ears and c_ears:
        if t_ears == c_ears:
            score += 15
            breakdown.append(f"Orejas {t_ears.lower()}: +15")

    # 4. Pattern (Max 12)
    t_pat = tv.get('coat_pattern')
    c_pat = cv.get('coat_pattern')
    if t_pat and c_pat:
        if t_pat == c_pat:
            score += 12
            breakdown.append(f"Patrón {t_pat.lower()}: +12")

    # 5. Fur Length (Max 8)
    t_fur = tv.get('fur_length')
    c_fur = cv.get('fur_length')
    if t_fur and c_fur:
        if t_fur == c_fur:
            score += 8
            breakdown.append(f"Largo de pelo {t_fur.lower()}: +8")

    # 6. Sex Match (Max 8)
    if target['gender'] == candidate['gender'] and target['gender'] != 'UNKNOWN':
        score += 8
        breakdown.append(f"Sexo coincidente ({target['gender']}): +8")
    elif candidate['gender'] == 'UNKNOWN':
        score += 4
        breakdown.append("Sexo por verificar: +4")

    # 7. Proximity in Cali (Max 12)
    lat1, lon1 = target.get('lat', 3.45), target.get('lng', -76.53)
    lat2, lon2 = candidate.get('lat', 3.45), candidate.get('lng', -76.53)
    dist = ((lat2 - lat1)**2 + (lon2 - lon1)**2)**0.5 * 111
    if dist <= 2.0:
        score += 12
        breakdown.append(f"Mismo sector ({round(dist, 1)}km): +12")
    elif dist <= 5.0:
        score += 7
        breakdown.append(f"Sector cercano ({round(dist, 1)}km): +7")
    elif dist <= 9.0:
        score += 3
        breakdown.append(f"Distancia media ({round(dist, 1)}km): +3")

    return score, breakdown

print("=== TEST DAKOTA (B5) ===")
for cand_id in ['R8', 'R16', 'R39', 'R1']:
    score, bd = calculate_biometric_score('B5', cand_id)
    print(f"B5 vs {cand_id} -> SCORE: {score}%")
    for b in bd:
        print(f"   {b}")

print("\n=== TEST ANGEL (B3) ===")
for cand_id in ['R17', 'R18', 'R131']:
    score, bd = calculate_biometric_score('B3', cand_id)
    print(f"B3 vs {cand_id} -> SCORE: {score}%")
    for b in bd:
        print(f"   {b}")
