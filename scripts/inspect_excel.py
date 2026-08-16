import pandas as pd
import shutil
import json

shutil.copy2("docs/Base de Datos de Masctoas.xlsx", "temp_inspect.xlsx")

for sheet in ["Buscandose", "Rescatadas"]:
    print(f"\n================ SHEET: {sheet} ================")
    df = pd.read_excel("temp_inspect.xlsx", sheet_name=sheet)
    print("Shape:", df.shape)
    for i in range(min(12, len(df))):
        row = df.iloc[i]
        print(f"Row {i}: ID='{row.get('ID')}' | Animal='{row.get('Animal')}' | Nombre='{row.get('Nombre')}' | Caract='{row.get('Caracteristicas')}' | Ultimo='{row.get('Ultimo Lugar Visto', row.get('Donde se encontro'))}'")
