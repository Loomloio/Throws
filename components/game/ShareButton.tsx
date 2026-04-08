"use client";

import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  onShare: () => void;
  className?: string;
}

export function ShareButton({ onShare, className }: ShareButtonProps) {
  return (
    <Button
      onClick={onShare}
      variant="outline"
      size="sm"
      className={`border-cyan/30 text-cyan hover:bg-cyan/10 gap-1.5 text-[10px] ${className}`}
    >
      <XIcon />
      share
    </Button>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
