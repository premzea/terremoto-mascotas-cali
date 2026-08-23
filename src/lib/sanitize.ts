/**
 * Sanitizes descriptions by masking/removing any phone numbers, sensitive contact info,
 * and private shelter/resguardo locations to prevent telephone extortion and protect shelter privacy.
 */
export function sanitizeDescription(text?: string | null): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove Resguardo / Estadía / Custodia information from public descriptions
  cleaned = cleaned.replace(/(?:•\s*)?Resguardo\/Estad[íi]a:\s*[^•\n\r]+/gi, "");
  cleaned = cleaned.replace(/(?:•\s*)?Resguardo:\s*[^•\n\r]+/gi, "");
  cleaned = cleaned.replace(/(?:•\s*)?Lugar de Estad[íi]a:\s*[^•\n\r]+/gi, "");
  cleaned = cleaned.replace(/(?:•\s*)?Hogar de paso:\s*[^•\n\r]+/gi, "");
  cleaned = cleaned.replace(/(?:•\s*)?Ubicaci[oó]n de resguardo:\s*[^•\n\r]+/gi, "");
  cleaned = cleaned.replace(/(?:•\s*)?En custodia de:\s*[^•\n\r]+/gi, "");

  // 2. Regex matching Colombian / standard phone numbers: 7-10 digits, +57, spaced/dashed numbers
  const phonePattern = /(?:\+?57\s*)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\b3\d{9}\b|\b\d{7,10}\b|\b3\d{2}\s*\d{3}\s*\d{4}\b)/g;
  cleaned = cleaned.replace(phonePattern, "[Contacto Protegido]");

  // 3. Clean up any empty labels like "Temperamento: [Contacto Protegido]" or stray dashes/bullets
  cleaned = cleaned.replace(/•\s*Temperamento:\s*\[Contacto Protegido\]/gi, "");
  cleaned = cleaned.replace(/Temperamento:\s*\[Contacto Protegido\]/gi, "");
  cleaned = cleaned.replace(/\s*•\s*•\s*/g, " • ");
  cleaned = cleaned.replace(/\s*•\s*$/g, "");
  cleaned = cleaned.replace(/^\s*•\s*/g, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
}

/**
 * Extracts shelter / resguardo information from description if present (for authorized triage view only).
 */
export function extractResguardoInfo(text?: string | null): string | null {
  if (!text) return null;

  const patterns = [
    /Resguardo\/Estad[íi]a:\s*([^•\n\r]+)/i,
    /Resguardo:\s*([^•\n\r]+)/i,
    /Lugar de Estad[íi]a:\s*([^•\n\r]+)/i,
    /Hogar de paso:\s*([^•\n\r]+)/i,
    /Ubicaci[oó]n de resguardo:\s*([^•\n\r]+)/i,
    /En custodia de:\s*([^•\n\r]+)/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1] && match[1].trim() && match[1].trim().toLowerCase() !== "na") {
      return match[1].trim();
    }
  }

  return null;
}
