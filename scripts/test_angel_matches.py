import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

angel = next((p for p in pets if p['id'] == 'B3'), None)
found_cats = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'CAT']

print('--- TARGET: ANGEL (B3) ---')
print(f"Name: {angel['name']}, Color: {angel['primary_color']}, Sexo: {angel['gender']}")
print(f"Visual Traits: {vf.get('B3')}")

print(f"\nTotal Found Cats in database: {len(found_cats)}")

r131 = next((p for p in found_cats if p['id'] == 'R131'), None)
if r131:
    r131_vf = vf.get('R131', {})
    print(f"\nCheck R131: Color is {r131_vf.get('primary_color')}")

print("\n--- Testing Candidates for Angel ---")
valid_candidates = []
for c in found_cats:
    cvf = vf.get(c['id'], {})
    if angel['gender'] != 'UNKNOWN' and c['gender'] != 'UNKNOWN' and angel['gender'] != c['gender']:
        continue
    c_color = f"{cvf.get('primary_color', '')} {cvf.get('secondary_color', '')} {c.get('primary_color', '')}".lower()
    if 'naranja' in c_color and 'gris' not in c_color:
        continue # Ruled out!
    valid_candidates.append((c, cvf))

print(f"Candidates remaining for Angel after Chromatic & Sex Filtering: {len(valid_candidates)}")
for c, cvf in valid_candidates[:5]:
    print(f"  -> [{c['id']}] {c['name']}: {cvf.get('primary_color')} {cvf.get('secondary_color')} | Patrón: {cvf.get('coat_pattern')} | Barrio: {c['neighborhood']}")
