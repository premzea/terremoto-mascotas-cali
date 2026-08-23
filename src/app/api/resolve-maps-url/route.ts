import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    // 1. Direct coordinate regex test
    const coordsMatch = trimmedUrl.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      return NextResponse.json({ success: true, lat, lng, source: "direct_coords" });
    }

    // 2. Direct @lat,lng or ?q=lat,lng regex test
    const atMatch = trimmedUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (atMatch) {
      return NextResponse.json({
        success: true,
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2]),
        source: "url_param_at",
      });
    }

    const qMatch = trimmedUrl.match(/[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (qMatch) {
      return NextResponse.json({
        success: true,
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2]),
        source: "url_param_q",
      });
    }

    const llMatch = trimmedUrl.match(/[?&]ll=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (llMatch) {
      return NextResponse.json({
        success: true,
        lat: parseFloat(llMatch[1]),
        lng: parseFloat(llMatch[2]),
        source: "url_param_ll",
      });
    }

    // 3. Shortlink resolution (e.g. maps.app.goo.gl or goo.gl/maps)
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(trimmedUrl)) {
      try {
        const fetchRes = await fetch(trimmedUrl, {
          method: "HEAD",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        const finalUrl = fetchRes.url;
        
        const finalAtMatch = finalUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
        if (finalAtMatch) {
          return NextResponse.json({
            success: true,
            lat: parseFloat(finalAtMatch[1]),
            lng: parseFloat(finalAtMatch[2]),
            source: "shortlink_resolved_at",
            finalUrl,
          });
        }

        const finalQMatch = finalUrl.match(/[?&]q=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
        if (finalQMatch) {
          return NextResponse.json({
            success: true,
            lat: parseFloat(finalQMatch[1]),
            lng: parseFloat(finalQMatch[2]),
            source: "shortlink_resolved_q",
            finalUrl,
          });
        }

        // Search for place coordinates in body if HEAD didn't contain @lat,lng
        const getRes = await fetch(trimmedUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        const html = await getRes.text();
        
        const bodyCoordsMatch = html.match(/\[null,null,(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)\]/);
        if (bodyCoordsMatch) {
          return NextResponse.json({
            success: true,
            lat: parseFloat(bodyCoordsMatch[1]),
            lng: parseFloat(bodyCoordsMatch[2]),
            source: "shortlink_body_coords",
          });
        }
      } catch (shortlinkErr) {
        console.warn("Failed to resolve Google Maps shortlink:", shortlinkErr);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron extraer coordenadas del enlace. Intenta copiar las coordenadas directamente (ej: 3.4516, -76.5320) o usar la búsqueda de lugares.",
      },
      { status: 422 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Error al procesar enlace" }, { status: 500 });
  }
}
