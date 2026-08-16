import os
import json
import glob
import time
from enum import Enum
from typing import List
from pydantic import BaseModel, Field
from PIL import Image
from google import genai
from google.genai import types

# ---------------------------------------------------------
# 1. ENUM DEFINITIONS (Exact match to User Specifications)
# ---------------------------------------------------------

class Species(str, Enum):
    DOG = "DOG"
    CAT = "CAT"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"

class Size(str, Enum):
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"
    UNKNOWN = "UNKNOWN"

class FurLength(str, Enum):
    SHORT = "SHORT"
    MEDIUM = "MEDIUM"
    LONG = "LONG"
    HAIRLESS = "HAIRLESS"
    UNKNOWN = "UNKNOWN"

class HeadAndMuzzleShape(str, Enum):
    POINTED_WEDGE = "POINTED_WEDGE"
    BROAD_FLAT = "BROAD_FLAT"
    PRISMATIC_SQUARE = "PRISMATIC_SQUARE"
    ROUND_DELICATE = "ROUND_DELICATE"
    UNKNOWN = "UNKNOWN"

class EarType(str, Enum):
    ERECT = "ERECT"
    FLOPPY = "FLOPPY"
    SEMI_ERECT = "SEMI_ERECT"
    UNKNOWN = "UNKNOWN"

class BodyBuild(str, Enum):
    STURDY_PROPORTIONATE = "STURDY_PROPORTIONATE"
    HEAVY_MASSIVE = "HEAVY_MASSIVE"
    SLENDER_AERODYNAMIC = "SLENDER_AERODYNAMIC"
    COMPACT_DWARF = "COMPACT_DWARF"
    TOY_MINIATURE = "TOY_MINIATURE"
    UNKNOWN = "UNKNOWN"

class CoatColor(str, Enum):
    BLACK = "BLACK"
    WHITE = "WHITE"
    BROWN = "BROWN"
    GOLDEN_YELLOW = "GOLDEN_YELLOW"
    GRAY_SILVER = "GRAY_SILVER"
    CREAM = "CREAM"
    ORANGE_RED = "ORANGE_RED"

class CoatPattern(str, Enum):
    SOLID = "SOLID"
    SPOTTED = "SPOTTED"
    STRIPED_TABBY = "STRIPED_TABBY"
    MERLE_BRINDLE = "MERLE_BRINDLE"
    PATCHED_CALICO = "PATCHED_CALICO"
    BICOLOR_TUXEDO = "BICOLOR_TUXEDO"
    POINTED_SIAMESE = "POINTED_SIAMESE"
    UNKNOWN = "UNKNOWN"

class EyeColor(str, Enum):
    BROWN = "BROWN"
    BLUE = "BLUE"
    GREEN = "GREEN"
    AMBER = "AMBER"
    HETEROCHROMIA = "HETEROCHROMIA"
    UNKNOWN = "UNKNOWN"

class NoseColor(str, Enum):
    BLACK = "BLACK"
    PINK = "PINK"
    BROWN = "BROWN"
    SPOTTED = "SPOTTED"
    UNKNOWN = "UNKNOWN"

# ---------------------------------------------------------
# 2. PYDANTIC SCHEMA 
# ---------------------------------------------------------

class PetMetadata(BaseModel):
    species: Species = Field(default=Species.UNKNOWN)
    size: Size = Field(default=Size.UNKNOWN)
    fur_length: FurLength = Field(default=FurLength.UNKNOWN)
    head_and_muzzle_shape: HeadAndMuzzleShape = Field(default=HeadAndMuzzleShape.UNKNOWN)
    ear_type: EarType = Field(default=EarType.UNKNOWN)
    body_build: BodyBuild = Field(default=BodyBuild.UNKNOWN)
    coat_colors: List[CoatColor] = Field(
        default_factory=list, 
        description="All observable coat colors. Do not rank by primary vs secondary."
    )
    coat_pattern: CoatPattern = Field(default=CoatPattern.UNKNOWN)
    eye_color: EyeColor = Field(default=EyeColor.UNKNOWN)
    nose_color: NoseColor = Field(default=NoseColor.UNKNOWN)
    distinctive_features: List[str] = Field(
        default_factory=list,
        max_length=3,
        description="Maximum of 3 short strings describing unique physical anomalies or visible accessories."
    )

SYSTEM_INSTRUCTION = """
You are an expert veterinary assistant and animal identifier in Cali, Colombia.
Analyze the provided image of an animal, which may be a street dog ("criollo") or cat, potentially in poor lighting or emergency conditions.
Extract its physical traits rigorously according to the provided schema and the provided Few-Shot Ground-Truth Reference Examples.

CALIBRATION RULES:
- Size: Judge relative to typical adult human surroundings. 
  - SMALL: Chihuahua, Pug, typical domestic cat.
  - MEDIUM: Beagle, typical street mix, Cocker Spaniel.
  - LARGE: German Shepherd, Golden Retriever, Husky, Belgian Malinois.
- Head/Muzzle: 
  - POINTED_WEDGE: Collies, Malinois, many cats.
  - BROAD_FLAT: Bulldogs, Boxers, Persians.
  - PRISMATIC_SQUARE: Retrievers, Mastiffs, Labradors.
  - ROUND_DELICATE: Chihuahuas, small terriers.
- Fallback Rule: If an image is muddy, dark, or cuts off parts of the animal, default to "UNKNOWN" for unobservable traits rather than guessing. 
- Coat Colors: Do not overthink primary/secondary. Simply list all observable colors from the allowed enum.
- Treat every animal independently of breed standards; describe exactly what is visible in the frame.
"""

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key and os.path.exists(".env.local"):
        with open(".env.local", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("GEMINI_API_KEY="):
                    api_key = line.strip().split("=", 1)[1].strip('"').strip("'")
                    break
    if api_key:
        return genai.Client(api_key=api_key)
    # Default to ADC / Vertex
    return genai.Client()

def extract_metadata_batch():
    client = get_gemini_client()
    photos_dir = "docs/Fotos"
    ref_json_path = "src/data/reference_calibration_e1_e20.json"
    
    with open(ref_json_path, "r", encoding="utf-8") as f:
        ground_truth = json.load(f)

    # 4 diverse anchors
    anchor_ids = ["E1", "E2", "E11", "E17"]
    few_shot_contents = []
    for aid in anchor_ids:
        matching = glob.glob(os.path.join(photos_dir, f"{aid}.*"))
        if matching:
            img = Image.open(matching[0])
            if img.mode != "RGB":
                img = img.convert("RGB")
            few_shot_contents.extend([
                f"Reference Example {aid}:",
                img,
                f"Ground-Truth Extraction: {json.dumps(ground_truth[aid])}"
            ])

    output_cache_path = "src/data/visual_features_v2_cache.json"
    cache = {}
    if os.path.exists(output_cache_path):
        try:
            with open(output_cache_path, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception:
            cache = {}

    all_photos = glob.glob(os.path.join(photos_dir, "B*.*")) + glob.glob(os.path.join(photos_dir, "R*.*"))
    print(f"Starting batch analysis on {len(all_photos)} photos. Existing in cache: {len(cache)}")

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema=PetMetadata,
        temperature=0.0,
    )

    count = 0
    for p_path in all_photos:
        filename = os.path.basename(p_path)
        pet_id = os.path.splitext(filename)[0]

        if pet_id in cache and cache[pet_id].get("coat_colors"):
            continue

        try:
            img = Image.open(p_path)
            if img.mode != "RGB":
                img = img.convert("RGB")

            contents = list(few_shot_contents)
            contents.extend([
                f"Analyze target pet {pet_id}:",
                img
            ])

            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=contents,
                config=config
            )

            meta = PetMetadata.model_validate_json(response.text)
            cache[pet_id] = meta.model_dump()
            count += 1
            print(f"[{count}] {pet_id}: Species={meta.species.value}, Colors={[c.value for c in meta.coat_colors]}, Pattern={meta.coat_pattern.value}, Build={meta.body_build.value}", flush=True)

            if count % 10 == 0:
                with open(output_cache_path, "w", encoding="utf-8") as f:
                    json.dump(cache, f, indent=2)

            time.sleep(0.3)
        except Exception as e:
            print(f"Error on {pet_id}: {e}", flush=True)
            time.sleep(1.0)

    with open(output_cache_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)
    print(f"Batch complete. Total in cache: {len(cache)}")

if __name__ == "__main__":
    extract_metadata_batch()
