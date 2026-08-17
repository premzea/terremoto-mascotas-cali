/**
 * Sanitizes descriptions by masking/removing any phone numbers or sensitive contact info
 * to prevent telephone extortion in crisis response.
 */
export function sanitizeDescription(text?: string | null): string {
  if (!text) return "";

  // Regex matching Colombian / standard phone numbers: 7-10 digits, +57, spaced/dashed numbers
  const phonePattern = /(?:\+?57\s*)?(?:3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|\b3\d{9}\b|\b\d{7,10}\b|\b3\d{2}\s*\d{3}\s*\d{4}\b)/g;
  
  let cleaned = text.replace(phonePattern, "[Contacto Protegido]");
  
  // Clean up any empty labels like "Temperamento: [Contacto Protegido]" or stray dashes
  cleaned = cleaned.replace(/•\s*Temperamento:\s*\[Contacto Protegido\]/gi, "");
  cleaned = cleaned.replace(/Temperamento:\s*\[Contacto Protegido\]/gi, "");
  cleaned = cleaned.replace(/\s*•\s*•\s*/g, " • ");
  cleaned = cleaned.replace(/\s*•\s*$/g, "");
  cleaned = cleaned.replace(/^\s*•\s*/g, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
}
