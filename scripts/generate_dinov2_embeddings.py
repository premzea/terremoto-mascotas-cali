import os
import json
import glob
import torch
import numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

def generate_dinov2_embeddings():
    print("Loading facebook/dinov2-base model...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    processor = AutoImageProcessor.from_pretrained("facebook/dinov2-base")
    model = AutoModel.from_pretrained("facebook/dinov2-base").to(device)
    model.eval()
    
    photos_dir = "docs/Fotos"
    all_photos = glob.glob(os.path.join(photos_dir, "*.*"))
    print(f"Found {len(all_photos)} images in {photos_dir}.")
    
    embeddings = {}
    output_path = "src/data/dinov2_embeddings.json"
    
    count = 0
    for p_path in all_photos:
        filename = os.path.basename(p_path)
        pet_id = os.path.splitext(filename)[0]
        
        try:
            img = Image.open(p_path)
            if img.mode != "RGB":
                img = img.convert("RGB")
                
            inputs = processor(images=img, return_tensors="pt").to(device)
            with torch.no_grad():
                outputs = model(**inputs)
                # CLS token pooling
                vec = outputs.last_hidden_state[:, 0, :].cpu().numpy().flatten()
                
            # L2 Normalization
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
                
            embeddings[pet_id] = [round(float(x), 5) for x in vec]
            count += 1
            if count % 25 == 0:
                print(f"Processed {count}/{len(all_photos)} DINOv2 embeddings...")
                
        except Exception as e:
            print(f"Error processing {pet_id}: {e}")
            
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(embeddings, f)
        
    print(f"Done! Generated DINOv2 embeddings for {len(embeddings)} pets in {output_path}.")

if __name__ == "__main__":
    generate_dinov2_embeddings()
