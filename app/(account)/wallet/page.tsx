"use client";

import { useState } from "react";
import { useUserStore } from "@/stores/userStore";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { WithdrawPanel } from "@/components/wallet/WithdrawPanel";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  const { userId, balance } = useUserStore();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Balance card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#14141f] to-[#0e0e16] p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-violet/5 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-magenta/5 rounded-full blur-3xl -ml-8 -mb-8" />
          <div className="relative">
            <p className="text-xs text-white/40 uppercase tracking-widest font-medium mb-2">
              Available Balance
            </p>
            <p className="text-5xl font-black font-mono tabular-nums text-white tracking-tight">
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>

        {userId ? (
          <>
            {/* Deposit / Withdraw toggle */}
            <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
              <button
                onClick={() => setActiveTab("deposit")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  activeTab === "deposit"
                    ? "bg-white/[0.08] text-white shadow-sm"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Deposit
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  activeTab === "withdraw"
                    ? "bg-white/[0.08] text-white shadow-sm"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Withdraw
              </button>
            </div>

            {/* Panel */}
            {activeTab === "deposit" ? <DepositPanel /> : <WithdrawPanel />}
          </>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-[#12121a] p-8 text-center">
            <p className="text-white/40 text-sm">
              Sign in to manage your wallet
            </p>
          </div>
        )}

        {/* Transactions */}
        <div>
          <h2 className="text-xs text-white/40 uppercase tracking-widest font-medium mb-3">
            Recent Transactions
          </h2>
          <div className="rounded-2xl border border-white/[0.06] bg-[#12121a] p-8 text-center">
            <p className="text-white/30 text-xs">No transactions yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
