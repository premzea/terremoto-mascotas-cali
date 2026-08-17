import json
import re

# Regex matching phone numbers (7 to 10 digits, with optional spaces, dashes, +57, etc.)
PHONE_REGEX = re.compile(r'(?:\+?57\s*)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\b3\d{9}\b|\b\d{7,10}\b|\b3\d{2}\s*\d{3}\s*\d{4}\b)')

def clean_phone_numbers(text):
    if not text or not isinstance(text, str):
        return text
    
    # Remove phone numbers explicitly
    cleaned = PHONE_REGEX.sub('', text)
    # Remove any stray "• Temperamento: -" or empty labels
    cleaned = re.sub(r'•\s*Temperamento:\s*[\-\s]*$', '', cleaned)
    cleaned = re.sub(r'•\s*Temperamento:\s*[\-\s]*•', '•', cleaned)
    cleaned = re.sub(r'(?:Tel[eé]fono|Celular|Contacto|WhatsApp|Wpp|Cel|Tel)[\s\:\.\-]*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*•\s*•\s*', ' • ', cleaned)
    cleaned = re.sub(r'\s*•\s*$', '', cleaned)
    cleaned = re.sub(r'^\s*•\s*', '', cleaned)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned

def main():
    path = "src/data/seed_pets.json"
    with open(path, "r", encoding="utf-8") as f:
        pets = json.load(f)

    count = 0
    for p in pets:
        desc = p.get("distinctive_features", "")
        cleaned_desc = clean_phone_numbers(desc)
        if desc != cleaned_desc:
            print(f"[{p['id']} - {p.get('name')}] Cleaned:")
            print(f"  BEFORE: {desc}")
            print(f"  AFTER:  {cleaned_desc}")
            p["distinctive_features"] = cleaned_desc
            count += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(pets, f, indent=2, ensure_ascii=False)

    print(f"\nTotal records cleaned: {count}")

if __name__ == "__main__":
    main()
