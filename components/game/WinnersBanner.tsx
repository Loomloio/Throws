"use client";

import { motion, AnimatePresence } from "framer-motion";

interface WinnersBannerProps {
  visible: boolean;
  winnerCount: number;
  totalPayout: number;
}

export function WinnersBanner({
  visible,
  winnerCount,
  totalPayout,
}: WinnersBannerProps) {
  return (
    <AnimatePresence>
      {visible && winnerCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", damping: 15 }}
          className="bg-card border border-border rounded-lg px-4 py-2.5 text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-bold text-green">
              {winnerCount} {winnerCount === 1 ? "winner" : "winners"}
            </span>
            <span className="text-xs text-muted-foreground">took home</span>
            <span className="text-sm font-bold font-mono text-green">
              ${totalPayout.toFixed(2)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
