import { ImageResponse } from "next/og";
import { fetchCoinDetails, fetchCoinMarketChart } from "@/lib/coingecko";
import { getOrRefreshRandomCoinPayload } from "@/lib/randomCoin";
import { RANDOM_COIN_CHART_DAYS } from "@/lib/cache";

export const runtime = "edge";

// Canvas constants (3:2 aspect ratio) and safe area (10% margins left/right)
const CANVAS_W = 1200; // width
const CANVAS_H = 800;  // height (3:2)
const SAFE_W = Math.floor(CANVAS_W * 0.8); // 80% centered safe area
const OUTER_GAP = 24;
const CARD_PADDING = 24;

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

function formatUsdAbbrev(n?: number): string {
  if (n == null) return "-";
  const abs = Math.abs(n);
  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];
  for (const { v, s } of units) {
    if (abs >= v) {
      const value = n / v;
      const formatted = Math.abs(value) < 10 ? value.toFixed(1) : value.toFixed(1);
      const trimmed = formatted.replace(/\.0$/, "");
      return `$${trimmed}${s}`;
    }
  }
  // Less than 1k, show full dollars with no decimals
  return `$${Math.round(n).toString()}`;
}

function renderSparkline(points: [number, number][], width = 1000, height = 300, stroke = "#22d3ee") {
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
  const areaD = `${d} V ${height} H 0 Z`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.00" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spark-grad)" stroke="none" />
      <path d={d} fill="none" stroke={stroke} strokeWidth={6} />
    </svg>
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const days = Number(searchParams.get("days") || RANDOM_COIN_CHART_DAYS);
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
    let details, chart;
    if (id === "__cached__") {
      const payload = await getOrRefreshRandomCoinPayload();
      if (!payload) throw new Error("Failed to load cached random coin payload");
      details = payload.details;
      chart = payload.chart;
    } else {
      const apiKey = process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY;
      [details, chart] = await Promise.all([
        fetchCoinDetails(id, apiKey),
        fetchCoinMarketChart(id, days, apiKey),
      ]);
    }

    const price = details.market_data?.current_price?.usd;
    const marketCap = details.market_data?.market_cap?.usd;
    const name = details.name;
    const symbol = details.symbol?.toUpperCase();
    const image = details.image?.large || details.image?.small || details.image?.thumb;
    const color = details.color || "#0ea5e9"; // default teal-ish if none

    const chartWidth = SAFE_W - CARD_PADDING * 2; // inner card width for sparkline
    const chartHeight = 420;

    return new ImageResponse(
      (
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            display: "flex",
            flexDirection: "column",
            padding: 48,
            background: "#ffffff",
            color: "#0b0d10",
            gap: OUTER_GAP,
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
          }}
        >
          {/* Centered safe-area wrapper */}
          <div style={{ display: "flex", flexDirection: "column", width: SAFE_W, alignSelf: "center", gap: OUTER_GAP }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {image ? (
              <img
                src={image}
                width={96}
                height={96}
                alt={name}
                style={{ borderRadius: 16, background: "#f0f3f7", display: "flex" }}
              />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>{name}</div>
              <div style={{ display: "flex", fontSize: 28, color: "#6b7280" }}>{symbol}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>{formatUsd(price)}</div>
              <div style={{ display: "flex", fontSize: 24, color: "#6b7280" }}>Market Cap {formatUsdAbbrev(marketCap)}</div>
            </div>
          </div>
          <div
            style={{
              borderRadius: 24,
              background: "#f5f7fb",
              padding: CARD_PADDING,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", fontSize: 24, color: "#6b7280" }}>{days}d price</div>
            <div style={{ display: "flex" }}>{renderSparkline(chart.prices, chartWidth, chartHeight, color)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 24, color: "#6b7280" }}>
              Powered by CoinGecko • Generated on Vercel
            </div>
          </div>
          </div>
        </div>
      ),
      { width: CANVAS_W, height: CANVAS_H }
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


