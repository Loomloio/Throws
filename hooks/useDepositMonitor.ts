"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useUserStore } from "@/stores/userStore";

/**
 * Polls the deposit API every 15 seconds to detect new deposits.
 * When new funds arrive on-chain, credits the user's game balance.
 */
export function useDepositMonitor(walletAddress: string | null) {
  const userId = useUserStore((s) => s.userId);
  const [lastDeposit, setLastDeposit] = useState<{
    amount: number;
    timestamp: number;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkDeposits = useCallback(async () => {
    if (!userId || !walletAddress || checking) return;

    setChecking(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, walletAddress }),
      });

      const data = await res.json();

      if (data.status === "deposited" && data.credited > 0) {
        // Update game balance
        useUserStore.getState().setBalance(data.newBalance);
        setLastDeposit({
          amount: data.credited,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Silently retry next interval
    }
    setChecking(false);
  }, [userId, walletAddress, checking]);

  // Manual trigger
  const refresh = useCallback(() => {
    checkDeposits();
  }, [checkDeposits]);

  useEffect(() => {
    if (!userId || !walletAddress) return;

    // Initial check
    checkDeposits();

    // Poll every 15 seconds
    intervalRef.current = setInterval(checkDeposits, 15_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId, walletAddress]);

  return { lastDeposit, checking, refresh };
}
