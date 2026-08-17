import json

def sql_escape(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    val_str = str(val).replace("'", "''")
    return f"'{val_str}'"

def main():
    with open("src/data/seed_pets.json", "r", encoding="utf-8") as f:
        pets = json.load(f)

    lines = [
        "-- Seed initial 239 authenticated pets for Búsqueda Animal Cali",
        "INSERT INTO pets (",
        "    id, report_type, species, name, gender, primary_color, secondary_color,",
        "    pattern, size, distinctive_features, neighborhood, lat, lng,",
        "    photo_url, contact_name, contact_phone, status, created_at",
        ") VALUES"
    ]

    values_list = []
    for p in pets:
        id_val = sql_escape(p.get("id"))
        rep_type = sql_escape(p.get("report_type", "LOST"))
        species = sql_escape(p.get("species", "DOG"))
        name = sql_escape(p.get("name", "Sin nombre"))
        gender = sql_escape(p.get("gender", "UNKNOWN"))
        color = sql_escape(p.get("primary_color", "Desconocido"))
        sec_color = sql_escape(p.get("secondary_color", ""))
        pattern = sql_escape(p.get("pattern", ""))
        size = sql_escape(p.get("size", "MEDIANO"))
        features = sql_escape(p.get("distinctive_features", ""))
        neighborhood = sql_escape(p.get("neighborhood", "Cali Centro"))
        lat = sql_escape(p.get("lat"))
        lng = sql_escape(p.get("lng"))
        photo_url = sql_escape(p.get("photo_url", "/placeholder-pet.png"))
        contact_name = sql_escape(p.get("contact_name", "Reportante"))
        contact_phone = sql_escape(p.get("contact_phone", p.get("contact_phone_masked", "")))
        status = sql_escape(p.get("status", "ACTIVE"))
        created_at = sql_escape(p.get("created_at", "2026-08-15T08:00:00Z"))

        row = f"    ({id_val}, {rep_type}, {species}, {name}, {gender}, {color}, {sec_color}, {pattern}, {size}, {features}, {neighborhood}, {lat}, {lng}, {photo_url}, {contact_name}, {contact_phone}, {status}, {created_at})"
        values_list.append(row)

    sql_content = "\n".join(lines) + "\n" + ",\n".join(values_list) + "\nON CONFLICT (id) DO NOTHING;\n"

    out_path = "supabase/migrations/20260816_seed_pets.sql"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(sql_content)

    print(f"Generated {out_path} with {len(pets)} pets.")

if __name__ == "__main__":
    main()
