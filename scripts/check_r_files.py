import os
import glob

# Inspect all R files in docs/Fotos
r_docs = glob.glob("docs/Fotos/R*.*")
print(f"Total R files in docs/Fotos: {len(r_docs)}")
for f in r_docs[:20]:
    print(" ", f)

# Inspect all R files in public/photos
r_pub = glob.glob("public/photos/R*.*")
print(f"Total R files in public/photos: {len(r_pub)}")
for f in r_pub[:20]:
    print(" ", f)
