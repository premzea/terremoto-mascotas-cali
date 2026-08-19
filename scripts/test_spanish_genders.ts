import fs from "fs";
import { searchPetsWithSynonyms, getSpanishInflections, getSynonymsForWord } from "../src/lib/search/synonym-search";
import { PetReport } from "../src/lib/types";

const seedPets: PetReport[] = JSON.parse(fs.readFileSync("src/data/seed_pets.json", "utf-8"));

console.log("=== Inflections of 'partida' ===");
console.log(getSpanishInflections("partida"));

console.log("\n=== Synonyms of 'partida' (Feminine) ===");
console.log(Array.from(getSynonymsForWord("partida")).slice(0, 15));

console.log("\n=== Synonyms of 'partido' (Masculine) ===");
console.log(Array.from(getSynonymsForWord("partido")).slice(0, 15));

console.log("\n=== TEST 1: Searching for 'cola partida' (Feminine) ===");
const resF = searchPetsWithSynonyms("cola partida", seedPets);
console.log(`Top 1 result: [Score ${resF[0].matchScore}] ${resF[0].pet.id} (${resF[0].pet.name}) | ${resF[0].matchedKeywords.join(", ")} | Desc: ${resF[0].pet.distinctive_features}`);

console.log("\n=== TEST 2: Searching for 'rabo partido' (Masculine) ===");
const resM = searchPetsWithSynonyms("rabo partido", seedPets);
console.log(`Top 1 result: [Score ${resM[0].matchScore}] ${resM[0].pet.id} (${resM[0].pet.name}) | ${resM[0].matchedKeywords.join(", ")} | Desc: ${resM[0].pet.distinctive_features}`);

console.log("\n=== TEST 3: Searching for 'perra herida' (Feminine) vs 'perro herido' (Masculine) ===");
const resHerida = searchPetsWithSynonyms("perra herida", seedPets);
console.log(`Herida matches: ${resHerida.length}, Top 1: ${resHerida[0].pet.id} (${resHerida[0].pet.name})`);
const resHerido = searchPetsWithSynonyms("perro herido", seedPets);
console.log(`Herido matches: ${resHerido.length}, Top 1: ${resHerido[0].pet.id} (${resHerido[0].pet.name})`);
