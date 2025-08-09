import { NextResponse } from "next/server";
import { getOrRefreshRandomCoinPayload } from "@/lib/randomCoin";

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
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes to match our Redis TTL
      },
    });
  } catch (error) {
    return new NextResponse("Error generating image", { status: 500 });
  }
}
