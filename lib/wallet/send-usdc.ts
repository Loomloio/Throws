import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import bs58 from "bs58";

const RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const USDC_DECIMALS = 6;

/**
 * Load the platform hot wallet keypair from env.
 * HOT_WALLET_PRIVATE_KEY should be a base58-encoded secret key.
 */
function getHotWallet(): Keypair {
  const key = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!key) {
    throw new Error("HOT_WALLET_PRIVATE_KEY not configured");
  }
  return Keypair.fromSecretKey(bs58.decode(key));
}

/**
 * Send USDC from the platform hot wallet to a destination address.
 * Returns the transaction signature (hash).
 */
export async function sendUsdc(
  destinationAddress: string,
  amountUsd: number
): Promise<string> {
  const connection = new Connection(RPC_URL, "confirmed");
  const hotWallet = getHotWallet();
  const destination = new PublicKey(destinationAddress);

  // Convert USD amount to USDC smallest unit (6 decimals)
  const amountLamports = Math.floor(amountUsd * 10 ** USDC_DECIMALS);
  if (amountLamports <= 0) {
    throw new Error("Amount too small to send");
  }

  // Get or create the source token account (hot wallet's USDC account)
  const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    hotWallet,
    USDC_MINT,
    hotWallet.publicKey
  );

  // Get or create the destination token account
  // This handles the case where the user doesn't have a USDC token account yet
  const destTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    hotWallet, // payer for account creation if needed
    USDC_MINT,
    destination
  );

  // Create the transfer instruction
  const transferIx = createTransferInstruction(
    sourceTokenAccount.address,
    destTokenAccount.address,
    hotWallet.publicKey,
    amountLamports
  );

  const tx = new Transaction().add(transferIx);

  // Send and confirm
  const signature = await sendAndConfirmTransaction(connection, tx, [
    hotWallet,
  ]);

  return signature;
}

/**
 * Check the hot wallet's USDC balance.
 */
export async function getHotWalletUsdcBalance(): Promise<number> {
  const connection = new Connection(RPC_URL, "confirmed");
  const hotWallet = getHotWallet();

  try {
    const tokenAddress = await getAssociatedTokenAddress(
      USDC_MINT,
      hotWallet.publicKey
    );
    const balance = await connection.getTokenAccountBalance(tokenAddress);
    return balance.value.uiAmount || 0;
  } catch {
    return 0;
  }
}

/**
 * Validate that a string is a valid Solana public key.
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
