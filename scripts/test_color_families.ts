import { CoatColorEnum } from "../src/lib/matching-engine";

// Define Color Families (Chroma Clusters) to unify synonyms:
// - GINGER: Amarillo, Dorado, Naranja, Miel, Rubio
// - DARK: Negro, Café oscuro, Chocolate
// - LIGHT: Blanco, Crema, Beige, Arena
// - NEUTRAL: Gris, Plomo, Plata
export type ColorFamily = "GINGER_WARM" | "DARK" | "LIGHT" | "GRAY" | "BROWN";

export function getColorFamily(color?: CoatColorEnum): ColorFamily {
  switch (color) {
    case "GOLDEN_YELLOW":
    case "ORANGE_RED":
      return "GINGER_WARM";
    case "BLACK":
      return "DARK";
    case "BROWN":
      return "BROWN";
    case "WHITE":
    case "CREAM":
      return "LIGHT";
    case "GRAY_SILVER":
      return "GRAY";
    default:
      return "DARK";
  }
}

export function areColorsCompatible(c1?: CoatColorEnum, c2?: CoatColorEnum): boolean {
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  return getColorFamily(c1) === getColorFamily(c2);
}

console.log("Is GOLDEN_YELLOW compatible with ORANGE_RED (Amarillo vs Naranja/Miel)?", areColorsCompatible("GOLDEN_YELLOW", "ORANGE_RED"));
console.log("Is WHITE compatible with CREAM (Blanco vs Crema)?", areColorsCompatible("WHITE", "CREAM"));
console.log("Is WHITE compatible with BLACK (Blanco vs Negro)?", areColorsCompatible("WHITE", "BLACK"));
