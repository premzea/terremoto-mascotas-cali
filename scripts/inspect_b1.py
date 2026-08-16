import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

b1 = next((p for p in pets if p['id'] == 'B1'), None)
print("=== B1 DATA ===")
print("ID:", b1.get('id'), "Name:", b1.get('name'))
print("Primary color in seed:", b1.get('primary_color'))
print("Visual traits in cache:", vf.get('B1'))

# Check what color words exist in B1 seed vs visual traits
b1_vf = vf.get('B1', {})
txt = f"{b1_vf.get('primary_color', '')} {b1_vf.get('secondary_color', '')} {b1.get('primary_color', '')} {b1_vf.get('distinctive_marks', '')}".lower()
print("Total color text:", txt)

# Why did it match gray cats?
# Let's check what color words are in b1['primary_color'] from the spreadsheet:
print("Spreadsheet primary_color field:", b1.get('primary_color'))
print("Spreadsheet distinctive_features:", b1.get('distinctive_features'))
