import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)

with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

dakota = next(p for p in pets if p['id'] == 'B5')
print("--- TARGET PET ---")
print(f"ID: {dakota['id']}, Name: {dakota['name']}, Neighborhood: {dakota['neighborhood']}")
print(f"Vertex AI Vision: {vf.get('B5', {})}")

found_pets = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'DOG']

scored = []
for p in found_pets:
    pid = p['id']
    pvf = vf.get(pid, {})
    p_color = pvf.get('primary_color', '')
    is_dark = any(c in p_color.lower() for c in ['negro', 'oscuro', 'marrón', 'marron', 'cafe', 'atigrado'])
    scored.append({
        'id': pid,
        'name': p['name'],
        'neighborhood': p['neighborhood'],
        'primary_color': p_color,
        'breed': pvf.get('breed_likely', ''),
        'ears': pvf.get('ear_type', ''),
        'is_dark': is_dark,
        'summary': pvf.get('search_summary', '')
    })

print(f"\nTotal Found Dogs analyzed: {len(scored)}")
dark_dogs = [d for d in scored if d['is_dark']]
print(f"Found Dogs with Dark / Black fur matching Dakota: {len(dark_dogs)}")
for d in dark_dogs[:5]:
    print(f"  -> [{d['id']}] {d['name']} ({d['neighborhood']}): {d['breed']} | Color: {d['primary_color']} | Orejas: {d['ears']}")
