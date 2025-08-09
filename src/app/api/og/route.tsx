import { ImageResponse } from "next/og";
import { fetchCoinDetails, fetchCoinMarketChart } from "@/lib/coingecko";

export const runtime = "edge";

function formatUsd(n?: number): string {
  if (n == null) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: n < 1 ? 6 : 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function renderSparkline(points: [number, number][], width = 1000, height = 300) {
  if (!points || points.length === 0) return "";
  const values = points.map((p) => p[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const dx = width / (points.length - 1 || 1);
  const scaleY = (v: number) => {
    if (max === min) return height / 2;
    return height - ((v - min) / (max - min)) * height;
  };
  const d = points
    .map(([, v], i) => `${i === 0 ? "M" : "L"}${i * dx},${scaleY(v)}`)
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={d} fill="none" stroke="#22d3ee" strokeWidth={6} />
    </svg>
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const days = Number(searchParams.get("days") || 7);
  if (!id) {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0d10", color: "white", fontSize: 42 }}>
          Missing id
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  try {
    const apiKey = process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY;
    const [details, chart] = await Promise.all([
      fetchCoinDetails(id, apiKey),
      fetchCoinMarketChart(id, days, apiKey),
    ]);

    const price = details.market_data?.current_price?.usd;
    const marketCap = details.market_data?.market_cap?.usd;
    const name = details.name;
    const symbol = details.symbol?.toUpperCase();
    const image = details.image?.large || details.image?.small || details.image?.thumb;

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            padding: 48,
            background: "#0b0d10",
            color: "white",
            gap: 24,
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {image ? (
              <img
                src={image}
                width={96}
                height={96}
                alt={name}
                style={{ borderRadius: 16, background: "#111", display: "flex" }}
              />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>{name}</div>
              <div style={{ display: "flex", fontSize: 28, color: "#9ca3af" }}>{symbol}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{formatUsd(price)}</div>
              <div style={{ display: "flex", fontSize: 24, color: "#9ca3af" }}>Market Cap {formatUsd(marketCap)}</div>
            </div>
          </div>
          <div
            style={{
              borderRadius: 24,
              background: "#0f141a",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", fontSize: 24, color: "#9ca3af" }}>{days}d price</div>
            <div style={{ display: "flex" }}>{renderSparkline(chart.prices, 1104, 360)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 24, color: "#9ca3af" }}>
              Powered by CoinGecko • Generated on Vercel
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0d10", color: "white", fontSize: 32, padding: 40, textAlign: "center" }}>
          Failed to load chart. {String(message)}
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}


