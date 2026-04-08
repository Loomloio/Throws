"use client";

import { useRef, useEffect } from "react";
import { getHorseIdentity, SPRITE } from "@/lib/racing/constants";

interface HorseSpriteProps {
  slug: string;
  size?: number; // rendered size in px (square)
  className?: string;
}

const imageCache = new Map<string, HTMLImageElement>();

function loadImg(src: string): HTMLImageElement {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
}

export function HorseSprite({ slug, size = 32, className }: HorseSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const identity = getHorseIdentity(slug);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const bodyPath = `/horses/bodies/${identity.body}.png`;
    const hairPath = `/horses/${identity.hairType}-hair/${identity.hairColor}.png`;
    const facePath = identity.faceMarking > 0 ? `/horses/face-markings/${identity.faceMarking}.png` : null;

    const bodyImg = loadImg(bodyPath);
    const hairImg = loadImg(hairPath);
    const faceImg = facePath ? loadImg(facePath) : null;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;

      // Crop into the center of the frame so the horse fills more space
      // Full frame is 64x48 but the horse only occupies roughly the center 36x36
      const cropX = 14; // trim empty space from left
      const cropY = 6;  // trim empty space from top
      const cropW = 36; // cropped width
      const cropH = 38; // cropped height

      const srcX = cropX;
      const srcY = SPRITE.ROW_IDLE_RIGHT + cropY;

      // Fill the square canvas with the cropped region
      if (bodyImg.complete) ctx.drawImage(bodyImg, srcX, srcY, cropW, cropH, 0, 0, size, size);
      if (hairImg.complete) ctx.drawImage(hairImg, srcX, srcY, cropW, cropH, 0, 0, size, size);
      if (faceImg?.complete) ctx.drawImage(faceImg, srcX, srcY, cropW, cropH, 0, 0, size, size);
    }

    // Draw immediately if loaded, otherwise wait
    let loaded = 0;
    const total = faceImg ? 3 : 2;

    function onLoad() {
      loaded++;
      if (loaded >= total) draw();
    }

    // Check if already loaded
    if (bodyImg.complete) loaded++; else bodyImg.addEventListener("load", onLoad, { once: true });
    if (hairImg.complete) loaded++; else hairImg.addEventListener("load", onLoad, { once: true });
    if (faceImg) {
      if (faceImg.complete) loaded++; else faceImg.addEventListener("load", onLoad, { once: true });
    }

    if (loaded >= total) draw();
  }, [slug, size, identity]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
