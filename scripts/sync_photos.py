import os
import shutil
import glob

docs_photos = glob.glob("docs/Fotos/*.*")
print(f"Total photos in docs/Fotos: {len(docs_photos)}")

os.makedirs("public/photos", exist_ok=True)
copied = 0
for p in docs_photos:
    fname = os.path.basename(p)
    dest = os.path.join("public/photos", fname)
    shutil.copy2(p, dest)
    copied += 1

print(f"Successfully copied {copied} photos to public/photos.")
