import os
import json
import glob
import time
import vertexai
from vertexai.generative_models import GenerativeModel, Part, GenerationConfig

PROJECT_ID = "saludable-erp"
LOCATION = "us-central1"
MODEL_NAME = "gemini-2.5-flash"

SYSTEM_PROMPT = """
You are an expert veterinary assistant and animal identifier in Cali, Colombia.
Analyze the provided image of an animal, which may be a street dog ("criollo") or cat, potentially in poor lighting or emergency conditions.
Extract its physical traits rigorously according to the provided schema and the provided Few-Shot Ground-Truth Reference Examples.

Output STRICTLY a valid JSON object matching this schema:
{
  "species": "DOG" | "CAT" | "OTHER" | "UNKNOWN",
  "size": "SMALL" | "MEDIUM" | "LARGE" | "UNKNOWN",
  "fur_length": "SHORT" | "MEDIUM" | "LONG" | "HAIRLESS" | "UNKNOWN",
  "head_and_muzzle_shape": "POINTED_WEDGE" | "BROAD_FLAT" | "PRISMATIC_SQUARE" | "ROUND_DELICATE" | "UNKNOWN",
  "ear_type": "ERECT" | "FLOPPY" | "SEMI_ERECT" | "UNKNOWN",
  "body_build": "STURDY_PROPORTIONATE" | "HEAVY_MASSIVE" | "SLENDER_AERODYNAMIC" | "COMPACT_DWARF" | "TOY_MINIATURE" | "UNKNOWN",
  "coat_colors": ["BLACK" | "WHITE" | "BROWN" | "GOLDEN_YELLOW" | "GRAY_SILVER" | "CREAM" | "ORANGE_RED"],
  "coat_pattern": "SOLID" | "SPOTTED" | "STRIPED_TABBY" | "MERLE_BRINDLE" | "PATCHED_CALICO" | "BICOLOR_TUXEDO" | "POINTED_SIAMESE" | "UNKNOWN",
  "eye_color": "BROWN" | "BLUE" | "GREEN" | "AMBER" | "HETEROCHROMIA" | "UNKNOWN",
  "nose_color": "BLACK" | "PINK" | "BROWN" | "SPOTTED" | "UNKNOWN",
  "distinctive_features": ["max 3 unique strings"]
}
"""

def load_image_part(image_path: str):
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    mime_type = "image/png" if image_path.lower().endswith(".png") else "image/jpeg"
    return Part.from_data(data=image_bytes, mime_type=mime_type)

def main():
    print(f"Initializing Vertex AI (Project: {PROJECT_ID}, Location: {LOCATION})...")
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    model = GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PROMPT)

    photos_dir = "docs/Fotos"
    ref_json_path = "src/data/reference_calibration_e1_e20.json"
    with open(ref_json_path, "r", encoding="utf-8") as f:
        ground_truth = json.load(f)

    # 4 diverse anchors for calibration
    few_shot_parts = []
    for aid in ["E1", "E2", "E11", "E17"]:
        matches = glob.glob(os.path.join(photos_dir, f"{aid}.*"))
        if matches:
            part = load_image_part(matches[0])
            few_shot_parts.extend([
                f"Reference Example {aid}:",
                part,
                f"Ground Truth Extraction: {json.dumps(ground_truth[aid])}"
            ])

    output_path = "src/data/visual_features_v2_cache.json"
    cache = {}
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}

    all_photos = glob.glob(os.path.join(photos_dir, "B*.*")) + glob.glob(os.path.join(photos_dir, "R*.*"))
    print(f"Total target photos: {len(all_photos)}. Already in cache: {len(cache)}")

    config = GenerationConfig(
        response_mime_type="application/json",
        temperature=0.0,
    )

    count = 0
    for p_path in all_photos:
        filename = os.path.basename(p_path)
        pet_id = os.path.splitext(filename)[0]

        if pet_id in cache and cache[pet_id].get("coat_colors"):
            continue

        try:
            target_part = load_image_part(p_path)
            contents = list(few_shot_parts)
            contents.extend([
                f"Analyze target pet {pet_id}:",
                target_part
            ])

            response = model.generate_content(contents, generation_config=config)
            data = json.loads(response.text.strip())
            cache[pet_id] = data
            count += 1
            print(f"[{len(cache)}/{len(all_photos)}] Extracted {pet_id}: Species={data.get('species')}, Colors={data.get('coat_colors')}, Pattern={data.get('coat_pattern')}", flush=True)

            if count % 10 == 0:
                with open(output_path, "w", encoding="utf-8") as f:
                    json.dump(cache, f, indent=2)

            time.sleep(0.3)
        except Exception as e:
            print(f"Error on {pet_id}: {e}", flush=True)
            time.sleep(1.0)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)
    print(f"Vertex AI Batch Complete. Total cached: {len(cache)}")

if __name__ == "__main__":
    main()
