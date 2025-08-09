import Image from "next/image";
import type { Metadata } from "next";
import { getOrRefreshRandomCoinPayload } from "@/lib/randomCoin";

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || "";
  if (!raw) return "";
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getOrRefreshRandomCoinPayload();
  const coin = payload?.coin;
  const tokenName = coin?.name ?? "Token";
  const baseUrl = getBaseUrl();
  const ogUrl = payload && baseUrl && coin ? `${baseUrl}/api/og?id=${encodeURIComponent(coin.id)}&days=30` : undefined;

  // Build CAIP-19 for Base (chainId 8453) using ERC20 contract address when available
  let caip19Token: string | undefined;
  let actionUrl: string | undefined;
  if (payload?.details) {
    const platforms = payload.details.platforms ?? {};
    const baseKey = Object.keys(platforms).find(
      (k) => k.toLowerCase() === "base" || k.toLowerCase().includes("base")
    );
    const contract = baseKey ? platforms[baseKey] || undefined : undefined;
    if (contract && /^0x[a-fA-F0-9]{40}$/.test(contract)) {
      const addressLower = contract.toLowerCase();
      caip19Token = `eip155:8453/erc20:${addressLower}`;
      actionUrl = baseUrl || undefined; // Use site URL as requested
    } else {
      // Fallback to native asset on Base if no contract found
      caip19Token = `eip155:8453/slip44:60`;
      actionUrl = baseUrl || undefined; // Use site URL as requested
    }
  }

  const frame = {
    version: "next",
    imageUrl: ogUrl ??
      "",
    button: {
      title: `Swap ${tokenName}`,
      action: {
        type: "view_token",
        swap: true,
        token: caip19Token ?? "eip155:8453/slip44:60",
        name: `Swap ${tokenName}`,
        url: actionUrl ?? baseUrl ?? "",
      },
    },
  } as const;

  return {
    title: `Random Swap — ${tokenName}`,
    description: "Swap a random token each visit.",
    // Renders as <meta name="fc:frame" content="...">
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default async function Home() {
  const payload = await getOrRefreshRandomCoinPayload();
  const coin = payload?.coin;
  const tokenName = coin?.name ?? "Token";
  const ogPath = payload && coin ? `/api/og?id=${encodeURIComponent(coin.id)}&days=30` : null;
  const baseUrl = getBaseUrl();
  const embedUrl = baseUrl || null;
  const shareText = "Swap a random token in the feed!";
  const shareUrl = embedUrl
    ? `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(embedUrl)}`
    : null;

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[24px] row-start-2 items-center sm:items-start w-full max-w-[1200px]">
        {ogPath ? (
          // Use a plain img tag for dynamic route rendering without domain config
          <img
            src={ogPath}
            alt={`Price chart OG image for ${tokenName}`}
            width={1200}
            height={630}
            style={{ width: "100%", height: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}
          />
        ) : (
          <div className="text-sm text-neutral-500">No coin selected.</div>
        )}

        {shareUrl ? (
          <div className="flex w-full justify-center gap-2">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-black/5"
            >
              Share on Farcaster
            </a>
          </div>
        ) : null}
      </main>
    </div>
  );
}
