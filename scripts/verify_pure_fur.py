import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

def get_pure_fur_signature(visual, pet):
    # ONLY examine actual fur color fields!
    prim = str(visual.get('primary_color', '')).lower()
    sec = str(visual.get('secondary_color', '')).lower()
    pet_prim = str(pet.get('primary_color', '')).lower()
    
    # Ignore "desconocido"
    if pet_prim == 'desconocido':
        pet_prim = ''
        
    fur_txt = f"{prim} {sec} {pet_prim}".lower()
    
    is_orange = any(c in fur_txt for c in ['naranja', 'amarillo', 'miel', 'rubio', 'ginger', 'dorado', 'canela', 'garfield'])
    is_gray = any(c in fur_txt for c in ['gris', 'plomo', 'plateado', 'cenizo', 'azul ruso'])
    is_black = any(c in fur_txt for c in ['negro', 'azabache', 'oscuro'])
    is_brown = any(c in fur_txt for c in ['marron', 'marrón', 'cafe', 'café', 'chocolate'])
    is_white = any(c in fur_txt for c in ['blanco', 'crema'])

    # Determine dominant fur chroma
    if is_orange and is_white: return "ORANGE_WHITE"
    if is_orange: return "ORANGE_SOLID"
    if is_gray and is_white: return "GRAY_WHITE"
    if is_gray: return "GRAY_SOLID"
    if is_black and is_white: return "BLACK_WHITE"
    if is_black: return "BLACK_SOLID"
    if is_brown and is_white: return "BROWN_WHITE"
    if is_brown: return "BROWN_SOLID"
    if is_white: return "WHITE_SOLID"
    return "MULTICOLOR"

target = next(p for p in pets if p['id'] == 'B1')
target_vf = vf.get('B1', {})
target_sig = get_pure_fur_signature(target_vf, target)
print("=== MIEL (B1) PURE FUR SIGNATURE ===")
print("Signature:", target_sig)

found_cats = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'CAT']

matches = []
for c in found_cats:
    c_vf = vf.get(c['id'], {})
    c_sig = get_pure_fur_signature(c_vf, c)
    if target_sig == c_sig or (target_sig == "ORANGE_WHITE" and c_sig == "ORANGE_SOLID"):
        matches.append((c, c_sig, c_vf))

print(f"\nExact Orange Candidates for Miel ({len(matches)} found):")
for c, csig, cvf in matches:
    print(f"  -> [{c['id']}] {c['name']}: {cvf.get('primary_color')} {cvf.get('secondary_color')} | Sig: {csig} | Barrio: {c['neighborhood']}")
