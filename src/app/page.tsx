import Image from "next/image";
import type { Metadata } from "next";
import { getOrRefreshRandomCoin } from "@/lib/randomCoin";

export async function generateMetadata(): Promise<Metadata> {
  const coin = await getOrRefreshRandomCoin();
  const tokenName = coin?.name ?? "Token";
  const ogUrl = coin ? `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/og?id=${encodeURIComponent(coin.id)}&days=7` : undefined;

  const frame = {
    version: "next",
    imageUrl: ogUrl ??
      "https://wallet.coinbase.com/api/miniapps/social-swap/image?networkId=networks/ethereum-mainnet&nativeAssetSymbol=ETH",
    button: {
      title: "Trade",
      action: {
        type: "view_token",
        swap: true,
        token: "eip155:1/slip44:60",
        name: `Swap ${tokenName}`,
        url: "https://wallet.coinbase.com/asset?networkId=networks/ethereum-mainnet&contractAddress=native",
        splashImageUrl:
          "https://go.wallet.coinbase.com/static/wallets/coinbase-wallet.svg",
        splashBackgroundColor: "#0a0b0d",
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
  const coin = await getOrRefreshRandomCoin();
  const tokenName = coin?.name ?? "Token";
  const ogPath = coin ? `/api/og?id=${encodeURIComponent(coin.id)}&days=7` : null;

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[24px] row-start-2 items-center sm:items-start w-full max-w-[1200px]">
        <h1 className="text-2xl sm:text-3xl font-semibold">Random Swap — {tokenName}</h1>
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
      </main>
    </div>
  );
}
