"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PLAYER_IMAGES } from "@/lib/game/constants";
import type { Move, RoundResult } from "@/lib/game/constants";

interface WinCardProps {
  amount: number;
  betType: string;
  multiplier: number;
  roundNumber: number;
  result: RoundResult;
  winningMove: Move | null;
  violetMove: Move;
  magentaMove: Move;
  username: string;
  onClose: () => void;
}

const MOVE_LABEL: Record<Move, string> = {
  rock: "ROCK",
  paper: "PAPER",
  scissors: "SCISSORS",
};

function betDisplayName(betType: string): string {
  if (betType === "violet") return "BULL";
  if (betType === "magenta") return "BEAR";
  return betType.toUpperCase();
}

export function WinCard({
  amount,
  betType,
  multiplier,
  roundNumber,
  result,
  winningMove,
  violetMove,
  magentaMove,
  username,
  onClose,
}: WinCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      const maxWidth = window.innerWidth - 32; // 16px padding each side
      const s = Math.min(1, maxWidth / 600);
      setScale(s);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const bullWon = result === "violet_win";
  const bearWon = result === "magenta_win";

  const resultText = winningMove
    ? `${MOVE_LABEL[winningMove]} wins`
    : "DRAW";

  const matchupText = `${MOVE_LABEL[violetMove]} vs ${MOVE_LABEL[magentaMove]}`;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `throws-gg-win-round-${roundNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate card:", err);
    }
    setDownloading(false);
  }, [roundNumber]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `throws-gg-round-${roundNumber}.png`, { type: "image/png" });

      const text = `+$${amount.toFixed(2)} on @throwsgg 🎯\n${betDisplayName(betType)} at ${multiplier}x\nRound #${roundNumber} — provably fair\n\nthrows.gg`;

      // Try Web Share API (works on mobile — can include image)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          text,
          files: [file],
        });
        setDownloading(false);
        return;
      }

      // Fallback: copy image to clipboard + open Twitter with text
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard failed — just open Twitter
      }

      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(twitterUrl, "_blank", "noopener,noreferrer,width=550,height=420");
    } catch (err) {
      console.error("Share failed:", err);
    }
    setDownloading(false);
  }, [amount, betType, multiplier, roundNumber]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex flex-col items-center gap-4 max-w-md w-full">
        {/* Wrapper scales the card to fit mobile screens */}
        <div
          ref={wrapperRef}
          style={{
            width: 600 * scale,
            height: 315 * scale,
          }}
        >
        {/* The card — this is what gets captured as an image */}
        <div
          ref={cardRef}
          style={{
            width: 600,
            height: 315,
            background: "linear-gradient(135deg, #0A0A0F 0%, #12121A 50%, #0A0A0F 100%)",
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
            fontFamily: "Inter, system-ui, sans-serif",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* Glow accents */}
          <div style={{
            position: "absolute", top: -60, left: -60, width: 200, height: 200,
            background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", bottom: -60, right: -60, width: 200, height: 200,
            background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)",
          }} />

          {/* Top bar — logo + round */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ color: "#8B5CF6", fontWeight: 900, fontSize: 18, letterSpacing: "-0.5px" }}>
              throws.gg
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "monospace" }}>
              ROUND #{roundNumber.toLocaleString()}
            </div>
          </div>

          {/* Main content */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px", height: 200,
          }}>
            {/* Left — win amount + bet info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                fontSize: 48, fontWeight: 900, color: "#F59E0B", lineHeight: 1,
                textShadow: "0 0 30px rgba(245,158,11,0.4)",
              }}>
                +${amount.toFixed(2)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  background: "rgba(6,182,212,0.15)", color: "#06B6D4",
                  padding: "2px 10px", borderRadius: 6, fontSize: 14, fontWeight: 800,
                  fontFamily: "monospace",
                }}>
                  {multiplier}x
                </span>
                <span style={{
                  color: betType === "violet" ? "#8B5CF6" : betType === "magenta" ? "#EC4899" : "#06B6D4",
                  fontSize: 14, fontWeight: 700,
                }}>
                  {betDisplayName(betType)}
                </span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                {matchupText} — {resultText}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#22C55E",
                }} />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
                  provably fair · verified
                </span>
              </div>
            </div>

            {/* Right — characters */}
            <div style={{ display: "flex", alignItems: "center", gap: -10, position: "relative" }}>
              {/* Winner character prominent, loser behind and faded */}
              <div style={{
                width: 120, height: 120, borderRadius: "50%",
                border: bullWon ? "3px solid #8B5CF6" : bearWon ? "3px solid #EC4899" : "2px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: bullWon ? "rgba(139,92,246,0.15)" : bearWon ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.05)",
                boxShadow: bullWon ? "0 0 40px rgba(139,92,246,0.3)" : bearWon ? "0 0 40px rgba(236,72,153,0.3)" : "none",
                position: "relative", zIndex: 2,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bullWon ? "/characters/bull.png" : "/characters/bear.png"}
                  alt={bullWon ? "Bull" : "Bear"}
                  width={90}
                  height={90}
                  style={{ objectFit: "contain" }}
                />
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0 24px 14px",
          }}>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>
              @{username}
            </div>
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontStyle: "italic" }}>
              bull vs bear. they throw. you bet.
            </div>
          </div>
        </div>
        </div>

        {/* Action buttons — below the card, not captured */}
        <div className="flex gap-3 w-full max-w-[300px]">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2.5 rounded-lg bg-secondary border border-border text-sm font-bold text-foreground hover:bg-secondary/80 active:scale-[0.98] transition-all"
          >
            {downloading ? "..." : "save"}
          </button>
          <button
            onClick={handleShare}
            disabled={downloading}
            className="flex-1 py-2.5 rounded-lg bg-violet text-white text-sm font-bold hover:bg-violet/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <XIcon />
            {copied ? "copied! paste in tweet" : downloading ? "..." : "share"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            close
          </button>
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
