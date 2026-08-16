import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)

with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

dakota = next(p for p in pets if p['id'] == 'B5')
print("--- TARGET PET ---")
print(f"ID: {dakota['id']}, Name: {dakota['name']}, Sexo: {dakota['gender']}, Barrio: {dakota['neighborhood']}")
print(f"Vertex AI Vision: {vf.get('B5', {})}")

# Test matching logic with gender rule-out and breed morphology filter
found_pets = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'DOG']

print(f"\nTotal Found Dogs in database: {len(found_pets)}")

# Filter by gender compatibility
gender_compatible = [p for p in found_pets if p['gender'] == dakota['gender'] or p['gender'] == 'UNKNOWN' or dakota['gender'] == 'UNKNOWN']
print(f"Found Dogs with compatible gender ({dakota['gender']}): {len(gender_compatible)}")

# Rule out Bulldogs and tiny toys for Dakota (Shepherd)
def get_morph(text):
    b = str(text).lower()
    if any(k in b for k in ['pastor', 'malinois', 'belga', 'aleman', 'husky']):
        return "SHEPHERD"
    if any(k in b for k in ['bulldog', 'french', 'pug', 'boston']):
        return "BULLDOG"
    if any(k in b for k in ['pincher', 'chihuahua', 'toy', 'yorkie']):
        return "TOY"
    return "OTHER"

filtered = []
for p in gender_compatible:
    pvf = vf.get(p['id'], {})
    p_morph = get_morph(f"{pvf.get('breed_likely', '')} {p.get('primary_color', '')}")
    if p_morph in ['BULLDOG', 'TOY']:
        continue # Ruled out!
    filtered.append((p, pvf))

print(f"Found Dogs after morphology/breed rule-out: {len(filtered)}")
print("\nTop 5 Candidates for Dakota:")
for p, pvf in filtered[:5]:
    print(f"  -> [{p['id']}] {p['name']} ({p['gender']}): {pvf.get('breed_likely')} | Color: {pvf.get('primary_color')} | Barrio: {p['neighborhood']}")
