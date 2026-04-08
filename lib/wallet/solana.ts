import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Solana RPC endpoint — use Helius or other RPC provider in production
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

// USDC mint on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
// USDC has 6 decimals
const USDC_DECIMALS = 6;

let connection: Connection | null = null;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, "confirmed");
  }
  return connection;
}

/**
 * Get the SOL balance of a wallet in lamports.
 */
export async function getSolBalance(walletAddress: string): Promise<number> {
  const conn = getConnection();
  const pubkey = new PublicKey(walletAddress);
  const balance = await conn.getBalance(pubkey);
  return balance;
}

/**
 * Get the SOL balance in USD-equivalent.
 */
export async function getSolBalanceUsd(walletAddress: string): Promise<number> {
  const lamports = await getSolBalance(walletAddress);
  const sol = lamports / LAMPORTS_PER_SOL;
  const price = await getSolPrice();
  return sol * price;
}

/**
 * Get the USDC balance of a wallet.
 */
export async function getUsdcBalance(walletAddress: string): Promise<number> {
  const conn = getConnection();
  const pubkey = new PublicKey(walletAddress);

  try {
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
      mint: USDC_MINT,
    });

    if (tokenAccounts.value.length === 0) return 0;

    const usdcAccount = tokenAccounts.value[0];
    const amount = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount;
    return amount || 0;
  } catch {
    return 0;
  }
}

/**
 * Get both SOL and USDC balances for a wallet.
 */
export async function getWalletBalances(walletAddress: string): Promise<{
  solLamports: number;
  solUsd: number;
  usdc: number;
  totalUsd: number;
}> {
  const [solLamports, usdc] = await Promise.all([
    getSolBalance(walletAddress),
    getUsdcBalance(walletAddress),
  ]);

  const sol = solLamports / LAMPORTS_PER_SOL;
  const solPrice = await getSolPrice();
  const solUsd = sol * solPrice;

  return {
    solLamports,
    solUsd,
    usdc,
    totalUsd: solUsd + usdc,
  };
}

/**
 * Get SOL price in USD. Cached for 60 seconds.
 */
let cachedSolPrice: { price: number; timestamp: number } | null = null;

async function getSolPrice(): Promise<number> {
  if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < 60_000) {
    return cachedSolPrice.price;
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const price = data.solana?.usd || 150; // Fallback price
    cachedSolPrice = { price, timestamp: Date.now() };
    return price;
  } catch {
    return cachedSolPrice?.price || 150;
  }
}
