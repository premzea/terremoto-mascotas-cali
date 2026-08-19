import { PetReport } from "../types";
import visualFeaturesV2 from "@/data/visual_features_v2_cache.json";

// Spanish stop words / connectors that do NOT carry semantic search value
export const SEARCH_STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "lo", "al",
  "con", "sin", "por", "para", "en", "sobre", "entre", "hacia", "desde", "hasta",
  "a", "y", "e", "o", "u", "ni", "pero", "sino", "que", "se", "su", "sus", "mi",
  "tu", "es", "son", "era", "fue", "muy", "mas", "más", "como", "tiene", "tenia",
  "tenía", "trae", "lleva", "puesto", "esta", "está", "estaba", "visto", "encontrado",
  "perdido", "mascota", "animal"
]);

// Spanish normalization helper: lowercase, strip accents, remove punctuation
export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, " ")     // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Spanish Grammatical Gender and Number Inflection Generator:
 * Automatically derives masculine, feminine, singular, and plural variations of any adjective or noun.
 * Examples:
 * - "partida" -> ["partida", "partido", "partidas", "partidos"]
 * - "roto" -> ["roto", "rota", "rotos", "rotas"]
 * - "peludo" -> ["peludo", "peluda", "peludos", "peludas", "peludito", "peludita"]
 * - "azul" -> ["azul", "azules"]
 * - "manchado" -> ["manchado", "manchada", "manchados", "manchadas", "mancha", "manchas"]
 */
export function getSpanishInflections(word: string): string[] {
  const norm = normalizeSearchText(word);
  if (!norm || norm.length < 3) return [norm].filter(Boolean);

  const inflections = new Set<string>([norm]);

  // Words ending in -o / -a / -os / -as (e.g. roto/rota/rotos/rotas, partido/partida/partidos/partidas)
  if (/[oa]s?$/.test(norm)) {
    const stem = norm.replace(/[oa]s?$/, "");
    if (stem.length >= 2) {
      inflections.add(stem + "o");
      inflections.add(stem + "a");
      inflections.add(stem + "os");
      inflections.add(stem + "as");
      // Common diminutives
      inflections.add(stem + "ito");
      inflections.add(stem + "ita");
      inflections.add(stem + "itos");
      inflections.add(stem + "itas");
    }
  }

  // Participles ending in -ado/-ada/-idos/-idas
  if (/[ai]d[oa]s?$/.test(norm)) {
    const stem = norm.replace(/[ai]d[oa]s?$/, "");
    if (stem.length >= 2) {
      inflections.add(stem + "ado");
      inflections.add(stem + "ada");
      inflections.add(stem + "ados");
      inflections.add(stem + "adas");
      inflections.add(stem + "ido");
      inflections.add(stem + "ida");
      inflections.add(stem + "idos");
      inflections.add(stem + "idas");
    }
  }

  // Words ending in consonant (e.g. azul/azules, marron/marrones, gris/grises)
  if (/[^aeiou]es?$/.test(norm)) {
    const stem = norm.replace(/es?$/, "");
    if (stem.length >= 2) {
      inflections.add(stem);
      inflections.add(stem + "es");
      inflections.add(stem + "s");
      inflections.add(stem + "a");
      inflections.add(stem + "as");
      inflections.add(stem + "o");
      inflections.add(stem + "os");
    }
  }

  // Words ending in -e / -es (e.g. grande/grandes, verde/verdes)
  if (/e[s]?$/.test(norm)) {
    const stem = norm.replace(/e[s]?$/, "");
    if (stem.length >= 2) {
      inflections.add(stem + "e");
      inflections.add(stem + "es");
    }
  }

  return Array.from(inflections);
}

/**
 * Domain-specific Pet Thesaurus:
 * Groups semantic synonyms across physical features, injuries, anatomy, colors, accessories, etc.
 */
export const SYNONYM_GROUPS: string[][] = [
  // 1. Cola / Rabo & Condiciones
  ["cola", "rabo", "rabito", "colita"],
  ["rota", "roto", "partida", "partido", "fracturada", "fracturado", "quebrada", "quebrado", "doblada", "doblado", "torcida", "torcido", "desviada", "chueca", "chueco"],
  ["corta", "corto", "mocha", "mocho", "mochada", "mochado", "cortada", "cortado", "rabona", "rabon", "amputada", "amputado", "sin cola", "mutilada", "mutilado"],
  ["larga", "largo", "peluda", "peludo", "esponjosa", "esponjoso", "tupida", "tupido", "plumosa", "plumoso", "pompon", "pompón"],

  // 2. Orejas & Posición / Condición
  ["oreja", "orejas", "orejita", "orejitas"],
  ["parada", "parado", "paradas", "parados", "erecta", "erecto", "levantada", "levantado", "puntiaguda", "puntiagudo", "tiesa", "tieso"],
  ["caida", "caido", "gacha", "gacho", "doblada", "doblado", "flacida", "flacido", "largas", "agachada"],
  ["mocha", "mocho", "cortada", "cortado", "mutilada", "mutilado", "mordida", "mordido", "rasgada", "rasgado", "rajada", "rajado"],
  ["asimetrica", "asimetrico", "chueca", "chueco", "una parada", "desigual"],

  // 3. Ojos & Mirada / Defectos visuales
  ["ojo", "ojos", "ojito", "ojitos", "mirada"],
  ["azul", "azules", "celeste", "celestes", "zarco", "zarca", "claro", "clara", "claros", "claras"],
  ["verde", "verdes", "esmeralda"],
  ["marron", "marrones", "cafe", "cafes", "castano", "castana", "castaño", "castaña", "oscuro", "oscura"],
  ["miel", "ambar", "dorado", "dorada", "amarillo", "amarilla"],
  ["bicolor", "heterocromia", "diferentes", "zarco", "desiguales", "un ojo azul"],
  ["ciego", "ciega", "tuerto", "tuerta", "catarata", "cataratas", "nube", "nublado", "nublada", "sin ojo"],

  // 4. Heridas, Lesiones & Condición Médica
  ["herido", "herida", "lastimado", "lastimada", "lesionado", "lesionada", "golpeado", "golpeada", "atropellado", "atropellada", "sangrando", "corte", "cortada", "cortado", "laceracion", "raspado", "raspada", "raspon", "raspón"],
  ["cicatriz", "cicatrices", "marca", "marcas"],
  ["cojo", "coja", "rengo", "renga", "cojea", "renguea", "pata lastimada", "pata mala", "cojera", "fractura", "fracturado", "fracturada", "entablillado", "entablillada"],
  ["flaco", "flaca", "delgado", "delgada", "desnutrido", "desnutrida", "huesudo", "huesuda", "demacrado", "demacrada"],
  ["gordo", "gorda", "robusto", "robusta", "obeso", "obesa", "rellenito", "rellenita"],
  ["sarna", "sarnoso", "sarnosa", "pelado", "pelada", "sin pelo", "dermatitis", "calvo", "calva", "hongos", "heridas en piel"],
  ["embarazada", "preñada", "gestante", "pariendo", "con cachorros", "lactando"],

  // 5. Accesorios & Ropa
  ["collar", "collarcito", "collarin", "correa"],
  ["panueleta", "pañoleta", "bandana", "panuelo", "pañuelo"],
  ["arnes", "pechera", "arnés", "chaleco", "arnes k9", "pechera policial"],
  ["placa", "plaquita", "medalla", "chapa", "identificador", "dije", "placa roja", "placa azul"],
  ["cascabel", "campana", "campanita"],
  ["sueter", "suéter", "buzo", "camisa", "ropa", "ropita", "chaleco", "vestido"],

  // 6. Textura y Largo de Pelaje
  ["peludo", "peluda", "pelo largo", "largo", "larga", "esponjoso", "esponjosa", "lanudo", "lanuda", "abundante", "melena", "melenudo", "crespo", "crespa", "ondulado", "ondulada", "enrulado", "enrulada", "rizado", "rizada", "chino", "china"],
  ["pelo corto", "corto", "corta", "raso", "rasa", "liso", "lisa", "cortito", "cortita", "bajito"],
  ["chascoso", "chascosa", "chascon", "chascona", "barbudo", "barbuda", "bigotudo", "bigotuda", "mechudo", "mechuda", "terrier", "shaggy", "peludo de cara"],
  ["calvo", "calva", "sin pelo", "lampiño", "lampiña", "pelado", "pelada"],

  // 7. Manchas & Patrones de Pelaje
  ["manchas", "mancha", "manchado", "manchada", "pintas", "pinta", "pintado", "pintada", "pecas", "pecoso", "pecosa", "lunares", "lunar", "motas", "moteado", "moteada"],
  ["atigrado", "atigrada", "rayas", "rayado", "rayada", "tabby", "tigre", "tigrillo", "tigrecito", "romanos"],
  ["abigarrado", "abigarrada", "brindle", "jaspeado", "jaspeada"],
  ["carey", "calico", "calicó", "tricolor", "tres colores", "manchas negras y naranjas", "concha de tortuga"],
  ["tuxedo", "bicolor", "pecho blanco", "pechera blanca", "patas blancas", "botas blancas", "calcetines blancos", "esmoquin"],
  ["antifaz", "mascara", "máscara", "parche", "pirata", "ojo tapado", "mancha en ojo", "mancha en la cara"],
  ["lucero", "estrella", "mancha en frente", "frente blanca", "raya en frente", "blaze", "llamarada"],

  // 8. Colores de Pelaje
  ["negro", "negra", "azabache", "oscuro", "oscura", "prieto", "prieta", "black"],
  ["blanco", "blanca", "nieve", "claro", "clara", "white"],
  ["cafe", "café", "marron", "marrón", "chocolate", "castano", "castana", "castaño", "castaña", "pardo", "parda", "brown"],
  ["amarillo", "amarilla", "dorado", "dorada", "miel", "rubio", "rubia", "canela", "crema", "beige", "arena", "golden", "yellow"],
  ["naranja", "rojo", "roja", "rojizo", "rojiza", "anaranjado", "anaranjada", "ginger", "caramelo", "orange", "red"],
  ["gris", "plomo", "ploma", "plateado", "plateada", "cenizo", "ceniza", "azulado", "azulada", "humo", "gray", "silver"],

  // 9. Edad, Tamaño y Género
  ["cachorro", "cachorra", "bebe", "bebê", "perrito", "perrita", "gatito", "gatita", "pequenito", "pequeñito", "pequenita", "pequeñita", "chiquito", "chiquita", "cria", "cría"],
  ["viejito", "viejita", "anciano", "anciana", "senil", "abuelo", "abuela", "canoso", "canosa", "canas", "hocico blanco", "viejoncito", "viejoncita"],
  ["pequeno", "pequeño", "pequena", "pequeña", "chiquito", "chiquita", "enano", "enana", "mini", "toy", "diminuto", "diminuta"],
  ["mediano", "mediana", "estandar", "promedio"],
  ["grande", "grando", "enorme", "gigante", "alto", "alta", "corpulento", "corpulenta"],
  ["macho", "machito"],
  ["hembra", "hembrita"],
  ["perro", "perros", "can", "canino", "canina", "perrito", "perrita"],
  ["gato", "gatos", "felino", "felina", "michi", "gatito", "gatita", "minino", "minina"],
  ["castrado", "esterilizado", "castrada", "esterilizada", "operado", "operada"],
  ["sin castrar", "entero", "entera", "sin esterilizar"],

  // 10. Tipo de Raza / Mestizaje
  ["criollo", "criolla", "mestizo", "mestiza", "chandoso", "chandosa", "cruzado", "cruzada", "callejero", "callejera", "sin raza"],
  ["pitbull", "bull", "pit", "american bully", "staffordshire"],
  ["labrador", "golden retriever", "retriever"],
  ["poodle", "caniche", "french poodle"],
  ["pinscher", "pincher", "doberman"],
  ["husky", "siberiano", "alaskano", "malamute", "nordico"],
  ["pastor", "pastor aleman", "ovejero", "pastor belga", "malinois", "pastor holandes"],
  ["pug", "carlino"],
  ["siames", "siamés"],
  ["persa", "angora"]
];

// Map each word (and all its grammatical inflections) to its expanded synonym set for O(1) lookups
const WORD_TO_SYNONYMS = new Map<string, Set<string>>();

for (const group of SYNONYM_GROUPS) {
  // Expand every word in the group with masculine, feminine, singular, plural
  const expandedGroup = new Set<string>();
  for (const rawWord of group) {
    const inflections = getSpanishInflections(rawWord);
    for (const inf of inflections) {
      const norm = normalizeSearchText(inf);
      if (norm) expandedGroup.add(norm);
    }
  }

  const groupArray = Array.from(expandedGroup);
  for (const word of groupArray) {
    let synSet = WORD_TO_SYNONYMS.get(word);
    if (!synSet) {
      synSet = new Set<string>();
      WORD_TO_SYNONYMS.set(word, synSet);
    }
    for (const syn of groupArray) {
      if (syn !== word) synSet.add(syn);
    }
  }
}

/**
 * Returns all synonyms of a word, or an empty set if none registered.
 */
export function getSynonymsForWord(word: string): Set<string> {
  const norm = normalizeSearchText(word);
  return WORD_TO_SYNONYMS.get(norm) || new Set<string>();
}

export interface SearchMatchResult {
  pet: PetReport;
  matchScore: number;
  matchedKeywords: string[];
  matchedSynonyms: { queryWord: string; foundWord: string }[];
}

/**
 * Multi-Keyword + Synonym Relevance Search Engine:
 * 1. Tokenizes user query into non-stopword keywords.
 * 2. For each keyword, searches for exact occurrences and semantic synonyms.
 * 3. Scores every pet report based on keyword density, exact matches vs synonym matches.
 * 4. The more keywords match, the higher the pet ranks in the query results!
 */
export function searchPetsWithSynonyms(
  query: string,
  pets: PetReport[]
): SearchMatchResult[] {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) {
    return pets.map((p) => ({
      pet: p,
      matchScore: 0,
      matchedKeywords: [],
      matchedSynonyms: []
    }));
  }

  // Tokenize query words
  const rawTokens = normQuery.split(/\s+/).filter(Boolean);
  const keywords = rawTokens.filter((t) => !SEARCH_STOPWORDS.has(t) && t.length >= 2);

  // If all tokens were stopwords (e.g. "el perro"), fallback to using all raw tokens
  const activeKeywords = keywords.length > 0 ? keywords : rawTokens;

  const v2Map = visualFeaturesV2 as Record<string, any>;
  const results: SearchMatchResult[] = [];

  for (const pet of pets) {
    const v2 = v2Map[pet.id || ""] || {};
    
    // Assemble all textual fields for the pet
    const nameNorm = normalizeSearchText(pet.name || "");
    const speciesNorm = pet.species === "DOG" ? "perro perros can canino perrito" : "gato gatos felino michi gatito minino";
    const genderNorm = pet.gender === "MACHO" ? "macho machito" : pet.gender === "HEMBRA" ? "hembra hembrita" : "";
    const featuresNorm = normalizeSearchText(pet.distinctive_features || "");
    const colorNorm = normalizeSearchText(`${pet.primary_color || ""} ${pet.secondary_color || ""}`);
    const neighborhoodNorm = normalizeSearchText(`${pet.neighborhood || ""} ${(pet as any).comuna || ""}`);
    const v2FeaturesNorm = normalizeSearchText((v2.distinctive_features || []).join(" "));
    const v2BreedNorm = normalizeSearchText(v2.breed_likely || "");
    const v2PatternNorm = normalizeSearchText(v2.coat_pattern || "");
    const v2FurNorm = normalizeSearchText(v2.fur_length || "");

    const fullPetText = `${nameNorm} ${speciesNorm} ${genderNorm} ${featuresNorm} ${colorNorm} ${neighborhoodNorm} ${v2FeaturesNorm} ${v2BreedNorm} ${v2PatternNorm} ${v2FurNorm}`;
    const petWords = new Set(fullPetText.split(/\s+/).filter(Boolean));

    let totalScore = 0;
    const matchedKeywords: string[] = [];
    const matchedSynonyms: { queryWord: string; foundWord: string }[] = [];

    for (const keyword of activeKeywords) {
      let kwMatched = false;

      // 1. Exact or Substring Match in text fields
      if (petWords.has(keyword) || fullPetText.includes(keyword)) {
        totalScore += 10;
        kwMatched = true;
        matchedKeywords.push(keyword);
      } else {
        // 2. Synonym Search
        const synonyms = getSynonymsForWord(keyword);
        for (const syn of synonyms) {
          if (petWords.has(syn) || fullPetText.includes(syn)) {
            totalScore += 7; // High score for semantic synonym
            kwMatched = true;
            matchedKeywords.push(`${keyword} ➜ ${syn}`);
            matchedSynonyms.push({ queryWord: keyword, foundWord: syn });
            break; // Count once per keyword
          }
        }
      }
    }

    if (totalScore > 0) {
      // Synergy Multiplier: If pet matches multiple distinct query keywords (e.g. "cola" + "partida")
      const distinctMatchedCount = matchedKeywords.length;
      if (distinctMatchedCount > 1) {
        totalScore = Math.round(totalScore * (1 + 0.35 * (distinctMatchedCount - 1)));
      }

      results.push({
        pet,
        matchScore: totalScore,
        matchedKeywords,
        matchedSynonyms
      });
    }
  }

  // Sort descending by relevance score (highest matches first!)
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
}
