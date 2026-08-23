import { NextRequest, NextResponse } from "next/server";
import barrioCoordsData from "@/data/coords_by_barrio.json";

interface GeocodeResult {
  name: string;
  display_name: string;
  lat: number;
  lng: number;
  type?: string;
  category?: string;
}

const barriosList = Object.values(barrioCoordsData) as Array<{
  name: string;
  lat: number;
  lng: number;
  comuna: string;
  zone?: string;
}>;

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getClosestBarrioName(lat: number, lng: number): string {
  let minDistance = Infinity;
  let closest = "Cali Centro";

  for (const b of barriosList) {
    const dLat = b.lat - lat;
    const dLng = b.lng - lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDistance) {
      minDistance = dist;
      closest = b.name;
    }
  }

  return closest;
}

// Popular landmark shortcuts in Cali for instant 0ms responses
const POPULAR_CALI_LANDMARKS: Record<string, { name: string; lat: number; lng: number; type: string }> = {
  "chipichape": { name: "Centro Comercial Chipichape", lat: 3.4754, lng: -76.5273, type: "mall" },
  "unicentro": { name: "Centro Comercial Unicentro Cali", lat: 3.3768, lng: -76.5404, type: "mall" },
  "jardin plaza": { name: "Centro Comercial Jardín Plaza", lat: 3.3705, lng: -76.5332, type: "mall" },
  "cosmocentro": { name: "Centro Comercial Cosmocentro", lat: 3.4182, lng: -76.5451, type: "mall" },
  "palmetto": { name: "Palmetto Plaza", lat: 3.4143, lng: -76.5458, type: "mall" },
  "parque del perro": { name: "Parque del Perro (San Fernando)", lat: 3.4358, lng: -76.5469, type: "park" },
  "parque de las banderas": { name: "Parque de las Banderas / Panamericano", lat: 3.4312, lng: -76.5414, type: "park" },
  "parque de la caña": { name: "Parque de la Caña de Azúcar", lat: 3.4608, lng: -76.5054, type: "park" },
  "parque de la retreta": { name: "Parque de la Retreta (Paseo Bolívar)", lat: 3.4542, lng: -76.5344, type: "park" },
  "boulevard del rio": { name: "Boulevard del Río Cali", lat: 3.4536, lng: -76.5341, type: "landmark" },
  "bulevar del rio": { name: "Boulevard del Río Cali", lat: 3.4536, lng: -76.5341, type: "landmark" },
  "cristo rey": { name: "Monumento a Cristo Rey", lat: 3.4361, lng: -76.5647, type: "landmark" },
  "las tres cruces": { name: "Cerro de las Tres Cruces", lat: 3.4682, lng: -76.5489, type: "landmark" },
  "zoologico de cali": { name: "Zoológico de Cali", lat: 3.4485, lng: -76.5591, type: "zoo" },
  "zoologico": { name: "Zoológico de Cali", lat: 3.4485, lng: -76.5591, type: "zoo" },
  "terminal": { name: "Terminal de Transportes de Cali (MiTerminal)", lat: 3.4665, lng: -76.5235, type: "transport" },
  "terminal de transportes": { name: "Terminal de Transportes de Cali", lat: 3.4665, lng: -76.5235, type: "transport" },
  "terminal menga": { name: "Terminal Menga MIO", lat: 3.4886, lng: -76.5167, type: "transport" },
  "terminal paso del comercio": { name: "Terminal Paso del Comercio MIO", lat: 3.4988, lng: -76.4883, type: "transport" },
  "terminal andres sanin": { name: "Terminal Andrés Sanín MIO", lat: 3.4418, lng: -76.4839, type: "transport" },
  "terminal calipso": { name: "Terminal Calipso MIO", lat: 3.4158, lng: -76.5054, type: "transport" },
  "universidad del valle": { name: "Universidad del Valle (Sede Meléndez)", lat: 3.3732, lng: -76.5338, type: "university" },
  "univalle": { name: "Universidad del Valle (Meléndez)", lat: 3.3732, lng: -76.5338, type: "university" },
  "universidad javeriana": { name: "Pontificia Universidad Javeriana Cali", lat: 3.3496, lng: -76.5309, type: "university" },
  "javeriana": { name: "Pontificia Universidad Javeriana Cali", lat: 3.3496, lng: -76.5309, type: "university" },
  "icesi": { name: "Universidad Icesi", lat: 3.3418, lng: -76.5304, type: "university" },
  "universidad icesi": { name: "Universidad Icesi", lat: 3.3418, lng: -76.5304, type: "university" },
  "usc": { name: "Universidad Santiago de Cali (Pampalinda)", lat: 3.4038, lng: -76.5482, type: "university" },
  "universidad santiago de cali": { name: "Universidad Santiago de Cali", lat: 3.4038, lng: -76.5482, type: "university" },
  "clinica valle del lili": { name: "Fundación Valle del Lili", lat: 3.3644, lng: -76.5298, type: "hospital" },
  "valle del lili": { name: "Fundación Valle del Lili / Barrio Valle del Lili", lat: 3.3644, lng: -76.5298, type: "hospital" },
  "clinica imbanaco": { name: "Centro Médico Imbanaco (San Fernando)", lat: 3.4294, lng: -76.5419, type: "hospital" },
  "imbanaco": { name: "Centro Médico Imbanaco", lat: 3.4294, lng: -76.5419, type: "hospital" },
  "hospital universitario del valle": { name: "Hospital Universitario del Valle (HUV)", lat: 3.4276, lng: -76.5422, type: "hospital" },
  "huv": { name: "Hospital Universitario del Valle (HUV)", lat: 3.4276, lng: -76.5422, type: "hospital" },
  "estadio pascual guerrero": { name: "Estadio Olímpico Pascual Guerrero", lat: 3.4303, lng: -76.5416, type: "stadium" },
  "pascual guerrero": { name: "Estadio Olímpico Pascual Guerrero", lat: 3.4303, lng: -76.5416, type: "stadium" },
  "estadio de cali": { name: "Estadio Deportivo Cali (Palmaseca)", lat: 3.5226, lng: -76.4172, type: "stadium" },
  "plaza de cayzedo": { name: "Plaza de Cayzedo (Centro)", lat: 3.4516, lng: -76.5323, type: "plaza" },
  "plaza de caicedo": { name: "Plaza de Cayzedo (Centro)", lat: 3.4516, lng: -76.5323, type: "plaza" },
  "centro comercial premier limonar": { name: "Premier Limonar", lat: 3.3986, lng: -76.5428, type: "mall" },
  "premier limonar": { name: "Premier Limonar", lat: 3.3986, lng: -76.5428, type: "mall" },
  "mall plaza": { name: "Mallplaza Cali", lat: 3.4158, lng: -76.5471, type: "mall" },
  "alfaguara": { name: "Alfaguara (Jamundí)", lat: 3.2562, lng: -76.5436, type: "neighbourhood" },
  "jamundi centro": { name: "Parque Principal de Jamundí", lat: 3.2608, lng: -76.5411, type: "plaza" }
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Mode 1: Reverse Geocoding from precise Lat/Lng
  if (searchParams.has("lat") && searchParams.has("lng")) {
    const lat = parseFloat(searchParams.get("lat")!);
    const lng = parseFloat(searchParams.get("lng")!);

    if (!isNaN(lat) && !isNaN(lng)) {
      const closestBarrio = getClosestBarrioName(lat, lng);
      let specificAddress = "";

      try {
        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await fetch(reverseUrl, {
          headers: { "User-Agent": "TerremotoMascotasCali/1.0" },
        });
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          const road = addr.road || addr.street || addr.pedestrian || "";
          const houseNumber = addr.house_number || "";
          const neighbourhood = addr.neighbourhood || addr.suburb || closestBarrio;
          const poi = addr.amenity || addr.shop || addr.building || addr.tourism || "";

          const parts: string[] = [];
          if (poi) parts.push(poi);
          if (road) parts.push(houseNumber ? `${road} #${houseNumber}` : road);
          if (neighbourhood && !parts.some((p) => p.toLowerCase().includes(neighbourhood.toLowerCase()))) {
            parts.push(neighbourhood);
          }

          specificAddress = parts.length > 0 ? parts.join(", ") : (data.name || closestBarrio);
        }
      } catch (err) {
        console.warn("Reverse geocode error, using fallback barrio:", err);
      }

      const finalLocationName = specificAddress || closestBarrio;
      return NextResponse.json({
        success: true,
        neighborhood: finalLocationName,
        barrio: closestBarrio,
        lat,
        lng,
      });
    }
  }

  // Mode 2: Forward Geocoding Search
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const normQ = normalize(q);
  const results: GeocodeResult[] = [];
  const addedCoords = new Set<string>();

  // 1. Direct landmark matching
  for (const [key, landmark] of Object.entries(POPULAR_CALI_LANDMARKS)) {
    if (key.includes(normQ) || normQ.includes(key)) {
      const coordKey = `${landmark.lat.toFixed(3)},${landmark.lng.toFixed(3)}`;
      if (!addedCoords.has(coordKey)) {
        addedCoords.add(coordKey);
        results.push({
          name: landmark.name,
          display_name: `${landmark.name}, Cali, Valle del Cauca`,
          lat: landmark.lat,
          lng: landmark.lng,
          type: landmark.type,
        });
      }
    }
  }

  // 2. Direct barrio matching
  for (const b of barriosList) {
    const normB = normalize(b.name);
    const normZone = b.zone ? normalize(b.zone) : "";
    if (normB.includes(normQ) || normZone.includes(normQ)) {
      const coordKey = `${b.lat.toFixed(3)},${b.lng.toFixed(3)}`;
      if (!addedCoords.has(coordKey)) {
        addedCoords.add(coordKey);
        results.push({
          name: b.name,
          display_name: `Barrio ${b.name}, ${b.zone || `Comuna ${b.comuna}`}, Cali`,
          lat: b.lat,
          lng: b.lng,
          type: "neighbourhood",
        });
      }
    }
  }

  // 3. Fallback to OpenStreetMap Geocoder
  if (results.length < 5 && q.length >= 3) {
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q + " Cali Colombia"
      )}&viewbox=-76.65,3.58,-76.43,3.22&bounded=0&limit=5`;

      const osmRes = await fetch(osmUrl, {
        headers: {
          "User-Agent": "TerremotoMascotasCali/1.0",
        },
      });

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        for (const item of osmData) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
          if (!addedCoords.has(coordKey)) {
            addedCoords.add(coordKey);
            results.push({
              name: item.name || item.display_name.split(",")[0],
              display_name: item.display_name,
              lat,
              lng,
              type: item.type || "place",
            });
          }
        }
      }
    } catch (e) {
      console.warn("External geocoder fallback error:", e);
    }
  }

  return NextResponse.json({ results: results.slice(0, 8) });
}
