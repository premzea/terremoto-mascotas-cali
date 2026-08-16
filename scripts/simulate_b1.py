import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

# Replicate getColorSignature from matching-engine.ts
def get_color_signature(visual, pet):
    txt = f"{visual.get('primary_color', '')} {visual.get('secondary_color', '')} {pet.get('primary_color', '')} {visual.get('distinctive_marks', '')}".lower()
    
    is_orange = any(c in txt for c in ['naranja', 'amarillo', 'miel', 'rubio', 'ginger', 'dorado', 'canela', 'garfield'])
    is_gray = any(c in txt for c in ['gris', 'plomo', 'plateado', 'cenizo', 'azul ruso'])
    is_black = any(c in txt for c in ['negro', 'azabache', 'oscuro'])
    is_brown = any(c in txt for c in ['marron', 'marrón', 'cafe', 'café', 'chocolate'])
    is_white = any(c in txt for c in ['blanco', 'crema'])

    if (is_orange and is_black and is_white) or 'carey' in txt or 'calico' in txt or 'tricolor' in txt:
        return "TRICOLOR_CAREY"
    if is_orange and is_white:
        return "ORANGE_WHITE"
    if is_orange:
        return "ORANGE_SOLID"
    if is_gray and is_white:
        return "GRAY_WHITE"
    if is_gray:
        return "GRAY_SOLID"
    if is_black and is_white:
        return "BLACK_WHITE"
    if is_black:
        return "BLACK_SOLID"
    if is_brown and is_white:
        return "BROWN_WHITE"
    if is_brown:
        return "BROWN_SOLID"
    if is_white:
        return "WHITE_SOLID"
    return "MULTICOLOR"

target = next(p for p in pets if p['id'] == 'B1')
target_vf = vf.get('B1', {})
target_sig = get_color_signature(target_vf, target)
print("Target B1 Signature:", target_sig)

found_cats = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'CAT']
print(f"Total Found Cats: {len(found_cats)}")

matches = []
for c in found_cats:
    c_vf = vf.get(c['id'], {})
    c_sig = get_color_signature(c_vf, c)
    
    # Check if signature matches
    if target_sig == c_sig:
        matches.append((c, c_sig, c_vf, 80))
    elif target_sig == "ORANGE_WHITE" and c_sig == "ORANGE_SOLID":
        matches.append((c, c_sig, c_vf, 65))
    elif target_sig == "ORANGE_SOLID" and c_sig == "ORANGE_WHITE":
        matches.append((c, c_sig, c_vf, 65))

print(f"\nCandidates for B1 ({len(matches)} found):")
for c, csig, cvf, sc in matches[:8]:
    print(f"  -> [{c['id']}] Sig: {csig} | Name: {c['name']} | Color: {cvf.get('primary_color')} {cvf.get('secondary_color')} | Barrio: {c['neighborhood']}")
