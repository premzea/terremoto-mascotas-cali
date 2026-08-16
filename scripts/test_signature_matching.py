import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

def get_color_signature(pet_id):
    p = next((x for x in pets if x['id'] == pet_id), None)
    v = vf.get(pet_id, {})
    if not p:
        return "UNKNOWN"
    
    txt = f"{v.get('primary_color', '')} {v.get('secondary_color', '')} {p.get('primary_color', '')}".lower()
    pat = str(v.get('coat_pattern', '')).lower()
    
    is_orange = any(c in txt for c in ['naranja', 'amarillo', 'miel', 'rubio', 'ginger', 'dorado'])
    is_gray = any(c in txt for c in ['gris', 'plomo', 'plateado', 'cenizo'])
    is_black = any(c in txt for c in ['negro', 'azabache', 'oscuro'])
    is_brown = any(c in txt for c in ['marron', 'marrón', 'cafe', 'café', 'chocolate'])
    is_white = any(c in txt for c in ['blanco', 'crema'])
    
    # Specific signatures
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

def test_cat_matching(target_id):
    target = next((x for x in pets if x['id'] == target_id), None)
    t_sig = get_color_signature(target_id)
    t_vf = vf.get(target_id, {})
    
    print(f"\n================ TARGET: {target['name']} ({target_id}) ================")
    print(f"Signature: {t_sig} | {t_vf.get('search_summary')}")
    
    found_cats = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'CAT']
    
    matches = []
    for c in found_cats:
        c_id = c['id']
        c_sig = get_color_signature(c_id)
        c_vf = vf.get(c_id, {})
        
        # Exact signature match
        if t_sig != c_sig:
            # Allow pure gray to match gray-white with penalty, but never match black-white or orange-white
            if t_sig == "GRAY_WHITE" and c_sig == "GRAY_SOLID":
                sig_score = 35
            elif t_sig == "ORANGE_WHITE" and c_sig == "ORANGE_SOLID":
                sig_score = 35
            elif t_sig == "BLACK_WHITE" and c_sig == "BLACK_SOLID":
                sig_score = 35
            else:
                continue # RULE OUT!
        else:
            sig_score = 55 # High base for exact color signature
            
        # Pattern match (Rayas vs Bicolor vs Solido)
        pat_score = 0
        if t_vf.get('coat_pattern') and t_vf.get('coat_pattern') == c_vf.get('coat_pattern'):
            pat_score = 20
            
        # Proximity in Cali
        lat1, lon1 = target.get('lat', 3.45), target.get('lng', -76.53)
        lat2, lon2 = c.get('lat', 3.45), c.get('lng', -76.53)
        dist = ((lat2 - lat1)**2 + (lon2 - lon1)**2)**0.5 * 111
        geo_score = max(0, int(15 * (1 - dist / 15)))
        
        total = sig_score + pat_score + geo_score
        matches.append((c, c_sig, c_vf, total, round(dist, 1)))
        
    matches.sort(key=lambda x: x[3], reverse=True)
    print(f"Found {len(matches)} matching candidates:")
    for c, csig, cvf, sc, dst in matches[:5]:
        print(f"   -> [{c['id']}] SCORE: {sc}% | Sig: {csig} | Patrón: {cvf.get('coat_pattern')} | Dist: {dst}km | {c['neighborhood']}")

test_cat_matching("B3") # Angel (Gray & White)
test_cat_matching("B2") # Pikachu (Black & White)
test_cat_matching("B1") # Miel (Orange & White)
