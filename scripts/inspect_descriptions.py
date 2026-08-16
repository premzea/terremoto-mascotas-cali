import pandas as pd
import shutil

shutil.copy2("docs/Base de Datos de Masctoas.xlsx", "temp_inspect.xlsx")

df_lost = pd.read_excel("temp_inspect.xlsx", sheet_name="Buscandose")
print("Buscandose columns with data sample:")
for col in df_lost.columns:
    non_null = df_lost[col].dropna().tolist()
    if len(non_null) > 2:
        print(f"  {col} -> sample: {non_null[1:4]}")

df_found = pd.read_excel("temp_inspect.xlsx", sheet_name="Rescatadas")
print("\nRescatadas columns with data sample:")
for col in df_found.columns:
    non_null = df_found[col].dropna().tolist()
    if len(non_null) > 2:
        print(f"  {col} -> sample: {non_null[1:4]}")
