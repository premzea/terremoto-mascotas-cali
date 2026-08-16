import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

r115 = next(p for p in pets if p['id'] == 'R115')
r115_vf = vf.get('R115', {})

print("R115 pet record:", r115)
print("R115 visual features:", r115_vf)

txt = f"{r115_vf.get('primary_color', '')} {r115_vf.get('secondary_color', '')} {r115.get('primary_color', '')} {r115_vf.get('distinctive_marks', '')}".lower()
print("R115 txt:", txt)
for w in ['naranja', 'amarillo', 'miel', 'rubio', 'ginger', 'dorado', 'canela', 'garfield']:
    if w in txt:
        print(f"MATCHED ORANGE KEYWORD: '{w}' in text!")
