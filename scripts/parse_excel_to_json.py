import pandas as pd
import json
import os
import re

# Cali Barrios with approximate geo centroids (Latitude, Longitude)
BARRIO_COORDS = {
    "cambulos": {"lat": 3.4215, "lng": -76.5412, "comuna": "19"},
    "villa del prado": {"lat": 3.4789, "lng": -76.5054, "comuna": "5"},
    "las vegas de comfandi": {"lat": 3.3980, "lng": -76.5220, "comuna": "17"},
    "ingenio": {"lat": 3.3850, "lng": -76.5360, "comuna": "17"},
    "nuevo tequendama": {"lat": 3.4150, "lng": -76.5420, "comuna": "19"},
    "valle del lili": {"lat": 3.3720, "lng": -76.5280, "comuna": "17"},
    "la flora": {"lat": 3.4850, "lng": -76.5250, "comuna": "2"},
    "menga": {"lat": 3.4980, "lng": -76.5200, "comuna": "2"},
    "campiña": {"lat": 3.4790, "lng": -76.5280, "comuna": "2"},
    "bretaña": {"lat": 3.4380, "lng": -76.5380, "comuna": "9"},
    "colseguros": {"lat": 3.4290, "lng": -76.5260, "comuna": "10"},
    "morichal": {"lat": 3.4120, "lng": -76.5020, "comuna": "13"},
    "ciudad melendez": {"lat": 3.3650, "lng": -76.5350, "comuna": "17"},
    "la ceiba": {"lat": 3.4520, "lng": -76.5080, "comuna": "7"},
    "noriente de cali": {"lat": 3.4650, "lng": -76.5020, "comuna": "6"},
    "san fernando": {"lat": 3.4310, "lng": -76.5450, "comuna": "19"},
    "cali centro": {"lat": 3.4516, "lng": -76.5320, "comuna": "3"},
    "san antonio": {"lat": 3.4470, "lng": -76.5410, "comuna": "3"},
    "granada": {"lat": 3.4580, "lng": -76.5340, "comuna": "2"},
    "el peñon": {"lat": 3.4490, "lng": -76.5450, "comuna": "3"},
    "limonar": {"lat": 3.4050, "lng": -76.5380, "comuna": "17"},
    "ciudad cordoba": {"lat": 3.4080, "lng": -76.5120, "comuna": "15"},
    "mariano ramos": {"lat": 3.4150, "lng": -76.5160, "comuna": "16"},
    "santa elena": {"lat": 3.4350, "lng": -76.5220, "comuna": "10"},
    "alameda": {"lat": 3.4400, "lng": -76.5350, "comuna": "9"}
}

def match_barrio_coords(text):
    if not text or pd.isna(text):
        return {"neighborhood": "Cali Centro (General)", "lat": 3.4516, "lng": -76.5320, "comuna": "3"}
    
    clean = str(text).lower()
    for key, data in BARRIO_COORDS.items():
        if key in clean:
            return {
                "neighborhood": str(text).strip(),
                "lat": data["lat"],
                "lng": data["lng"],
                "comuna": data["comuna"]
            }
    return {
        "neighborhood": str(text).strip(),
        "lat": 3.4516,
        "lng": -76.5320,
        "comuna": "General"
    }

def clean_species(text):
    if not text or pd.isna(text):
        return "OTHER"
    t = str(text).upper().strip()
    if "PERR" in t or "CAN" in t:
        return "DOG"
    if "GAT" in t or "FELIN" in t:
        return "CAT"
    return "OTHER"

def clean_gender(text):
    if not text or pd.isna(text):
        return "UNKNOWN"
    t = str(text).upper().strip()
    if "MACH" in t or t == "M":
        return "MACHO"
    if "HEMBR" in t or t == "H":
        return "HEMBRA"
    return "UNKNOWN"

def parse_excel():
    excel_path = "docs/Base de Datos de Masctoas.xlsx"
    if not os.path.exists(excel_path):
        print(f"File not found: {excel_path}")
        return
    
    all_pets = []
    
    # 1. Buscandose (Lost pets)
    try:
        df_lost = pd.read_excel(excel_path, sheet_name="Buscandose")
        for idx, row in df_lost.iterrows():
            loc_info = match_barrio_coords(row.get("Ultimo Lugar Visto", ""))
            pet = {
                "id": f"LOST-{idx+1}",
                "report_type": "LOST",
                "species": clean_species(row.get("Animal", "")),
                "name": str(row.get("Nombre", "Sin nombre")).strip() if pd.notna(row.get("Nombre")) else "Sin nombre",
                "gender": clean_gender(row.get("Sexo", "")),
                "primary_color": str(row.get("Caracteristicas", "Desconocido")).strip() if pd.notna(row.get("Caracteristicas")) else "Desconocido",
                "secondary_color": "",
                "pattern": "",
                "size": "MEDIANO",
                "distinctive_features": str(row.get("Temperamento", "")).strip() if pd.notna(row.get("Temperamento")) else "",
                "neighborhood": loc_info["neighborhood"],
                "lat": loc_info["lat"],
                "lng": loc_info["lng"],
                "comuna": loc_info["comuna"],
                "photo_url": "/placeholder-pet.png",
                "contact_name": "Dueño Reportante",
                "contact_phone_masked": "318******" + str(idx % 10),
                "source_url": str(row.get("Fuente", "")),
                "status": "ACTIVE",
                "created_at": "2026-08-15T08:00:00Z"
            }
            all_pets.append(pet)
    except Exception as e:
        print(f"Error parsing Buscandose: {e}")

    # 2. Rescatadas (Found / Sheltered pets)
    try:
        df_found = pd.read_excel(excel_path, sheet_name="Rescatadas")
        for idx, row in df_found.iterrows():
            loc_info = match_barrio_coords(row.get("Donde se encontro", ""))
            pet = {
                "id": f"FOUND-{idx+1}",
                "report_type": "FOUND",
                "species": clean_species(row.get("Animal", "")),
                "name": str(row.get("Nombre", "Rescatado")).strip() if pd.notna(row.get("Nombre")) else "Rescatado",
                "gender": clean_gender(row.get("Sexo", "")),
                "primary_color": str(row.get("Caracteristicas", "Desconocido")).strip() if pd.notna(row.get("Caracteristicas")) else "Desconocido",
                "secondary_color": "",
                "pattern": "",
                "size": "MEDIANO",
                "distinctive_features": str(row.get("Estadia", "")).strip() if pd.notna(row.get("Estadia")) else "",
                "neighborhood": loc_info["neighborhood"],
                "lat": loc_info["lat"],
                "lng": loc_info["lng"],
                "comuna": loc_info["comuna"],
                "photo_url": "/placeholder-pet.png",
                "contact_name": "Brigada de Rescate",
                "contact_phone_masked": "321******" + str(idx % 10),
                "source_url": str(row.get("Fuente", "")),
                "status": "ACTIVE",
                "created_at": "2026-08-15T09:00:00Z"
            }
            all_pets.append(pet)
    except Exception as e:
        print(f"Error parsing Rescatadas: {e}")

    # Output to src/data
    os.makedirs("src/data", exist_ok=True)
    with open("src/data/seed_pets.json", "w", encoding="utf-8") as f:
        json.dump(all_pets, f, ensure_ascii=False, indent=2)
        
    with open("src/data/coords_by_barrio.json", "w", encoding="utf-8") as f:
        json.dump(BARRIO_COORDS, f, ensure_ascii=False, indent=2)

    print(f"Successfully processed {len(all_pets)} pets into src/data/seed_pets.json and coords_by_barrio.json")

if __name__ == "__main__":
    parse_excel()
