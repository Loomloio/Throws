"use client";

import { useState, useEffect } from "react";
import { getHorseIdentity, SPRITE } from "@/lib/racing/constants";

const urlCache = new Map<string, string>();

export function useHorseSpriteUrl(slug: string, size = 64): string | null {
  const [url, setUrl] = useState<string | null>(urlCache.get(slug) ?? null);

  useEffect(() => {
    if (urlCache.has(slug)) {
      setUrl(urlCache.get(slug)!);
      return;
    }

    const identity = getHorseIdentity(slug);
    const bodyImg = new Image();
    const hairImg = new Image();
    const faceImg = identity.faceMarking > 0 ? new Image() : null;

    bodyImg.src = `/horses/bodies/${identity.body}.png`;
    hairImg.src = `/horses/${identity.hairType}-hair/${identity.hairColor}.png`;
    if (faceImg) faceImg.src = `/horses/face-markings/${identity.faceMarking}.png`;

    let loaded = 0;
    const total = faceImg ? 3 : 2;

    function tryRender() {
      loaded++;
      if (loaded < total) return;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      // Crop into center of frame so horse fills the image
      const cropX = 14;
      const cropY = 6;
      const cropW = 36;
      const cropH = 38;
      const srcX = cropX;
      const srcY = SPRITE.ROW_IDLE_RIGHT + cropY;

      ctx.drawImage(bodyImg, srcX, srcY, cropW, cropH, 0, 0, size, size);
      ctx.drawImage(hairImg, srcX, srcY, cropW, cropH, 0, 0, size, size);
      if (faceImg) ctx.drawImage(faceImg, srcX, srcY, cropW, cropH, 0, 0, size, size);

      const dataUrl = canvas.toDataURL("image/png");
      urlCache.set(slug, dataUrl);
      setUrl(dataUrl);
    }

    bodyImg.addEventListener("load", tryRender, { once: true });
    hairImg.addEventListener("load", tryRender, { once: true });
    if (faceImg) faceImg.addEventListener("load", tryRender, { once: true });

    // Handle already-cached images
    if (bodyImg.complete) tryRender();
    if (hairImg.complete) tryRender();
    if (faceImg?.complete) tryRender();
  }, [slug, size]);

  return url;
}
