import json

with open('src/data/seed_pets.json', 'r', encoding='utf-8') as f:
    pets = json.load(f)
with open('src/data/visual_features_cache.json', 'r', encoding='utf-8') as f:
    vf = json.load(f)

# Inspect all lost cats vs all found cats
lost_cats = [p for p in pets if p['report_type'] == 'LOST' and p['species'] == 'CAT']
found_cats = [p for p in pets if p['report_type'] == 'FOUND' and p['species'] == 'CAT']

print(f"Total Lost Cats: {len(lost_cats)}, Total Found Cats: {len(found_cats)}")

# Let's inspect Angel (B3) and Pikachu (B2) and B1
for lc in lost_cats[:3]:
    lc_id = lc['id']
    lc_vf = vf.get(lc_id, {})
    print(f"\n================ LOST CAT: {lc['name']} ({lc_id}) ================")
    print(f"Color: {lc_vf.get('primary_color')}, Sec: {lc_vf.get('secondary_color')}, Pat: {lc_vf.get('coat_pattern')}")
    print(f"Summary: {lc_vf.get('search_summary')}")
    
    # Check top matches in found cats
    scored = []
    for fc in found_cats:
        fc_id = fc['id']
        fc_vf = vf.get(fc_id, {})
        
        t_prim = str(lc_vf.get('primary_color', '')).lower()
        c_prim = str(fc_vf.get('primary_color', '')).lower()
        t_sec = str(lc_vf.get('secondary_color', '')).lower()
        c_sec = str(fc_vf.get('secondary_color', '')).lower()
        t_pat = str(lc_vf.get('coat_pattern', '')).lower()
        c_pat = str(fc_vf.get('coat_pattern', '')).lower()
        
        # Color match assessment:
        # Exact primary match
        is_exact_primary = t_prim == c_prim and t_prim != ''
        # Compatible secondary
        is_sec_match = (t_sec != '' and t_sec == c_sec) or (t_sec != '' and t_sec in c_prim) or (c_sec != '' and c_sec in t_prim)
        # Tabby vs solid pattern
        is_pat_match = t_pat == c_pat and t_pat != ''
        
        scored.append({
            'id': fc_id,
            'name': fc['name'],
            'c_prim': c_prim,
            'c_sec': c_sec,
            'c_pat': c_pat,
            'is_exact_primary': is_exact_primary,
            'is_sec_match': is_sec_match,
            'is_pat_match': is_pat_match,
            'barrio': fc['neighborhood']
        })
        
    print(f"Found cats with EXACT same primary color ({lc_vf.get('primary_color')}):")
    exacts = [s for s in scored if s['is_exact_primary']]
    for e in exacts[:5]:
        print(f"   -> [{e['id']}] {e['c_prim']} + {e['c_sec']} (Patrón: {e['c_pat']}) en {e['barrio']}")
    if not exacts:
        print("   (No exact primary color matches found in database)")
