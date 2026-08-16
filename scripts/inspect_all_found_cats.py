import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

# Inspect all found cats that have orange or gray
found_cats = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'CAT']

for c in found_cats:
    cid = c['id']
    cvf = vf.get(cid, {})
    prim = str(cvf.get('primary_color', '')).strip()
    sec = str(cvf.get('secondary_color', '')).strip()
    print(f"[{cid}] Prim: '{prim}' | Sec: '{sec}' | Seed: '{c.get('primary_color')}' | Summary: {cvf.get('search_summary')}")
