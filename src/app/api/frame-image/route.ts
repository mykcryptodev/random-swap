import { NextResponse } from "next/server";
import { getOrRefreshRandomCoinPayload } from "@/lib/randomCoin";
import { RANDOM_COIN_CACHE_TTL_SECONDS } from "@/lib/cache";

export async function GET() {
  try {
    const payload = await getOrRefreshRandomCoinPayload();
    
    if (!payload || !payload.ogImageBase64) {
      return new NextResponse("No image available", { status: 404 });
    }
    
    // Extract the base64 data from the data URI
    const base64Data = payload.ogImageBase64.replace(/^data:image\/png;base64,/, "");
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, "base64");
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": `public, s-maxage=${RANDOM_COIN_CACHE_TTL_SECONDS / 2}, max-age=${RANDOM_COIN_CACHE_TTL_SECONDS / 2}, stale-while-revalidate=0`,
        "CDN-Cache-Control": `max-age=${RANDOM_COIN_CACHE_TTL_SECONDS / 2}`,
        "Vercel-CDN-Cache-Control": `max-age=${RANDOM_COIN_CACHE_TTL_SECONDS / 2}`,
      },
    });
  } catch (error) {
    return new NextResponse("Error generating image", { status: 500 });
  }
}
